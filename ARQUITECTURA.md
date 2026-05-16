# HealthSync

## ¿Qué hace?

HealthSync es un monitor de signos vitales en tiempo real para una clínica. La idea: un tablero donde se ven todas las camas del hospital y los signos de cada paciente (latidos del corazón, oxígeno en sangre, temperatura). Cuando algo sale mal, la cama se pone roja al instante y el personal médico se entera sin tener que recargar la página.

## Las 4 piezas

El sistema está dividido en 4 servicios independientes. Cada uno corre en su propia "caja" (contenedor de Docker), aislado de los demás. Si uno se cae, los otros siguen.

```
                       envía signos
   ┌───────────┐       cada segundo       ┌───────────┐         guarda          ┌───────────┐
   │ Simulator │  ───────────────────▶    │  Backend  │  ─────────────────▶    │ Database  │
   └───────────┘                          └───────────┘                         └───────────┘
                                                │   ▲
                                       avisa al │   │ se conecta para
                                       frontend │   │ ver lo que pasa
                                                ▼   │
                                          ┌─────────┴──┐
                                          │  Frontend  │
                                          └────────────┘
```

### 1. Database — la memoria

Postgres con TimescaleDB. Aquí se guarda todo: las camas, los signos vitales, las alertas, los usuarios, los pacientes.

TimescaleDB es como Postgres normal pero optimizado para datos que llegan en avalancha con marca de tiempo (justo lo que pasa con signos vitales que entran cada segundo).

### 2. Backend — el cerebro

Una aplicación en Node.js que:

- Recibe los signos vitales
- Decide si un valor es normal, una alerta, o un error del sensor
- Los guarda en la base de datos
- Le avisa al frontend cuando hay una alerta

### 3. Simulator — los sensores falsos

Aún no tenemos sensores reales conectados a camas reales, así que este servicio finge serlo. Cada segundo manda datos al backend pretendiendo ser cada una de las 10 camas. En un hospital real esto se reemplazaría por sensores físicos.

### 4. Frontend — lo que ven los médicos

Página web hecha en React. Muestra las camas y reacciona en tiempo real cuando algo cambia. También tiene una página `/sender` para mandar valores manualmente (sirve para probar el sistema sin esperar a que el simulator genere una emergencia por casualidad).

## El viaje de un dato

Sigamos un signo vital desde que "nace" hasta que se ve en pantalla:

1. El **simulator** genera un valor (ej: bpm = 80) y lo manda al backend
2. El **backend** lo recibe
3. Revisa: _¿es físicamente posible?_ Si la temperatura es 150°C, eso no existe → error de sensor → lo registra en `sensor_logs` y responde con error
4. Si pasa el chequeo, lo **guarda** en la tabla `vitals`
5. Revisa: _¿es anómalo?_ (bpm muy alto, oxígeno bajo, etc.)
6. Si es anómalo → lo registra en `alerts` y **avisa al frontend** por WebSocket
7. El **frontend** estaba escuchando → pinta la cama de rojo

Todo este viaje tarda **milisegundos**.

## Tablas principales

Las que más se usan ahora mismo:

- **`beds`** — catálogo de camas (CAMA-01, CAMA-02, …). Se crean al inicio.
- **`vitals`** — todas las lecturas. Crece rapidísimo (~10 filas por segundo).
- **`alerts`** — solo cuando algo anómalo pasa. Mucho más pequeña.
- **`sensor_logs`** — registro de problemas del sensor para auditoría.

Otras tablas (`users`, `patients`, `bed_assignments`, `audit_log`) son para fases futuras del proyecto: login, asignar pacientes a camas, registrar quién acepta cada alerta, etc.

## Reglas de detección

El backend tiene reglas simples para decidir qué es alerta y qué es error:

| Métrica            | Cuándo es alerta                                     | Cuándo es imposible   |
| ------------------ | ---------------------------------------------------- | --------------------- |
| **Latidos (BPM)**  | Más de 150 (taquicardia) o menos de 40 (bradicardia) | Fuera de [20, 250]    |
| **Oxígeno (SpO2)** | Menos de 90% (hipoxia)                               | Fuera de [50, 100]    |
| **Temperatura**    | (sin regla clínica)                                  | Fuera de [25°C, 45°C] |

Estas reglas viven en un archivo llamado `anomaly.js` — fáciles de ajustar.

## ¿Por qué WebSocket y no peticiones normales?

Las peticiones HTTP normales (como Postman) son como mandar cartas: el cliente pregunta, el servidor responde, se termina la conexión.

Para un panel médico en tiempo real eso no sirve: tendrías que estar preguntando _"¿hay alertas? ¿hay alertas? ¿hay alertas?"_ cada segundo, desperdiciando recursos y con retraso.

**WebSocket** es diferente: la conexión queda abierta como una llamada telefónica. El backend puede "gritarle" al frontend en cualquier momento sin que pregunte. Cuando una cama tiene una emergencia, el frontend se entera al instante.

## ¿Por qué Docker?

Docker permite empacar cada servicio con todo lo que necesita (Node, Postgres, etc.) en una caja auto-contenida. Ventajas:

- **Aislamiento**: si la BD se cae, el backend sigue vivo
- **Portabilidad**: el mismo comando levanta todo en tu PC, en AWS o donde sea
- **No tienes que instalar nada**: ni Postgres, ni Node, ni nada — Docker se encarga
- **Auto-reinicio**: si un servicio se cae, Docker lo levanta solo

## Red y puertos

Los 4 servicios viven en una "red privada" llamada `healthsync-net`. Dentro de esa red se hablan por nombre (el backend le dice "db" a la base de datos, no una dirección IP).

Lo que sale al mundo exterior (tu computadora):

| Puerto | Servicio      | Para qué                                              |
| ------ | ------------- | ----------------------------------------------------- |
| 80     | Frontend      | Lo abres en el navegador                              |
| 3000   | Backend       | Para que el frontend (en tu navegador) pueda hablarle |
| 5432   | Base de datos | Para conectar herramientas como TablePlus             |

El **simulator no expone nada** — solo manda datos hacia adentro, nadie le habla a él.

## Cómo arrancar

Desde la carpeta `healthsync`:

```
docker compose up --build
```

Eso construye y levanta los 4 servicios. Cuando termine:

- **Frontend**: http://localhost
- **Backend** (chequeo de salud): http://localhost:3000/health
- **Base de datos**: conectar TablePlus a `localhost:5432`

Para apagar todo: `Ctrl+C` en la terminal y luego `docker compose down`.

## Páginas del frontend

- **`/dashboard`** — el panel principal con las camas en tiempo real
- **`/sender`** — panel manual para mandar lecturas a cualquier cama y probar el sistema (incluye botones de "Normal", "Taquicardia", "Hipoxia", etc.)
