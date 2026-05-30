#!/bin/bash
set -e

echo "==> Preparando directorios..."
mkdir -p /var/lib/munin /var/cache/munin/www /var/log/munin /var/run/munin
chown -R munin:munin /var/lib/munin /var/cache/munin /var/log/munin /var/run/munin
# /var/run/munin debe ser escribible por root tambien
chmod 0777 /var/run/munin /var/log/munin

echo "==> Habilitando plugins basicos (symlinks manuales)..."
for p in cpu df load memory processes swap uptime open_files forks; do
  if [ -e "/usr/share/munin/plugins/$p" ] && [ ! -e "/etc/munin/plugins/$p" ]; then
    ln -sf "/usr/share/munin/plugins/$p" "/etc/munin/plugins/$p"
  fi
done

echo "==> Intentando autodeteccion..."
munin-node-configure --shell 2>/dev/null | sh 2>/dev/null || true

echo "==> Asegurando permisos ejecutables en plugins..."
chmod +x /usr/share/munin/plugins/* 2>/dev/null || true

echo "==> Plugins finalmente habilitados:"
ls /etc/munin/plugins/ || true

echo "==> Reescribiendo /etc/munin/munin-node.conf..."
cat > /etc/munin/munin-node.conf <<'EOF'
log_level 4
log_file /var/log/munin/munin-node.log
pid_file /var/run/munin/munin-node.pid
background 1
setsid 1
user root
group root
host_name munin.local
allow ^127\.0\.0\.1$
host 0.0.0.0
port 4949
EOF

echo "==> Reescribiendo /etc/munin/munin.conf..."
cat > /etc/munin/munin.conf <<'EOF'
dbdir       /var/lib/munin
htmldir     /var/cache/munin/www
logdir      /var/log/munin
rundir      /var/run/munin
tmpldir     /etc/munin/templates

[munin.local]
    address 127.0.0.1
    use_node_name yes
EOF

echo "==> Arrancando munin-node..."
/usr/sbin/munin-node 2>&1 || echo "munin-node retorno exit code: $?"

sleep 5

echo "==> ====== DIAGNOSTICO ======"
echo "==> Contenido de /var/log/munin/munin-node.log:"
cat /var/log/munin/munin-node.log 2>&1 || echo "(log no existe todavia)"

echo "==> Procesos relacionados a munin corriendo:"
ps -ef 2>&1 | grep -i munin | grep -v grep || echo "(NINGUN proceso munin esta corriendo!)"

echo "==> Test de conexion directa a 127.0.0.1:4949:"
(timeout 3 bash -c 'exec 3<>/dev/tcp/127.0.0.1/4949 && echo "list" >&3 && cat <&3' 2>&1 | head -3) || echo "(puerto 4949 no responde)"

echo "==> ====== FIN DIAGNOSTICO ======"

echo "==> Intentando munin-cron de todas formas..."
runuser -u munin -- munin-cron 2>&1 || echo "WARN: munin-cron fallo"

echo "==> Listado de /var/cache/munin/www/:"
ls /var/cache/munin/www/ 2>&1 || true

echo "==> Bucle de regeneracion cada 5 min..."
(
  while true; do
    sleep 300
    runuser -u munin -- munin-cron 2>&1 || true
  done
) &

echo "==> Arrancando nginx..."
exec nginx -g 'daemon off;'
