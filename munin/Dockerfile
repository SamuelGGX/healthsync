FROM debian:bookworm-slim

# Set timezone for El Salvador
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=America/El_Salvador

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    apache2 \
    ca-certificates \
    curl \
    python3 \
    tzdata \
    munin \
    munin-node \
  && rm -rf /var/lib/apt/lists/*

# Ensure container uses requested TZ
RUN ln -sf /usr/share/zoneinfo/${TZ} /etc/localtime \
  && echo ${TZ} > /etc/timezone || true

RUN printf 'Listen 8081\n' > /etc/apache2/ports.conf \
  && a2enmod headers \
  && a2enmod cgi \
  && rm -f /etc/apache2/sites-enabled/000-default.conf

RUN sed -i \
  -e 's/^background 1/background 0/' \
  -e 's/^setsid 1/setsid 0/' \
  -e 's/^host \*/host 127.0.0.1/' \
  /etc/munin/munin-node.conf

COPY munin.conf /etc/munin/munin.conf
COPY apache-munin.conf /etc/apache2/sites-available/healthsync-munin.conf
COPY plugin-conf.d/ /etc/munin/plugin-conf.d/
COPY static/custom.css /usr/local/share/healthsync-munin/custom.css
COPY entrypoint.sh /usr/local/bin/healthsync-munin-entrypoint
COPY cgi/munin-summary.py /usr/lib/cgi-bin/munin-summary.py

RUN chmod +x /usr/local/bin/healthsync-munin-entrypoint \
  && a2ensite healthsync-munin \
  && mkdir -p /etc/munin/plugins \
  && for plugin in cpu df load memory processes swap uptime; do \
       ln -sf /usr/share/munin/plugins/$plugin /etc/munin/plugins/$plugin; \
     done \
  && ln -sf /usr/share/munin/plugins/if_ /etc/munin/plugins/if_eth0 \
  && mkdir -p /var/lib/munin /var/cache/munin/www /var/log/munin /var/run/munin
RUN chmod +x /usr/lib/cgi-bin/munin-summary.py || true

EXPOSE 8081

ENTRYPOINT ["/usr/local/bin/healthsync-munin-entrypoint"]