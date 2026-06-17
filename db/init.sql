-- Habilitar extensión TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Slow query tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'medico', 'enfermero')),
    refresh_token VARCHAR(500),
    last_login    TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: patients
-- ============================================================
CREATE TABLE patients (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    document_id   VARCHAR(50)  NOT NULL UNIQUE,
    birth_date    DATE         NOT NULL,
    blood_type    VARCHAR(5),
    admitted_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    discharged_at TIMESTAMP
);

-- ============================================================
-- TABLA: beds
-- ============================================================
CREATE TABLE beds (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20)  NOT NULL UNIQUE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disconnected')),
    auto_simulate   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: bed_assignments
-- ============================================================
CREATE TABLE bed_assignments (
    id               SERIAL PRIMARY KEY,
    bed_id           INT       NOT NULL REFERENCES beds(id),
    patient_id       INT       NOT NULL REFERENCES patients(id),
    assigned_user_id INT       NOT NULL REFERENCES users(id),
    assigned_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at         TIMESTAMP
);

-- ============================================================
-- TABLA: alerts
-- ============================================================
CREATE TABLE alerts (
    id              BIGSERIAL PRIMARY KEY,
    bed_id          INT           NOT NULL REFERENCES beds(id),
    acknowledged_by INT           REFERENCES users(id),
    type            VARCHAR(50)   NOT NULL,
    message         TEXT,
    value           FLOAT,
    status          VARCHAR(20)   NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    triggered_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP,
    resolved_at     TIMESTAMP
);

-- ============================================================
-- TABLA: audit_log
-- ============================================================
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INT         NOT NULL REFERENCES users(id),
    action      VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'BED_ASSIGN', 'BED_RELEASE')),
    table_name  VARCHAR(50) NOT NULL,
    record_id   VARCHAR(50),
    old_value   TEXT,
    new_value   TEXT,
    occurred_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: vitals  (hypertable TimescaleDB)
-- ============================================================
CREATE TABLE vitals (
    id          BIGSERIAL,
    bed_id      INT       NOT NULL REFERENCES beds(id),
    bpm         FLOAT,
    spo2        FLOAT,
    temperature FLOAT,
    is_valid    BOOLEAN   NOT NULL DEFAULT TRUE,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('vitals', 'recorded_at');

-- ============================================================
-- TABLA: sensor_logs
-- ============================================================
CREATE TABLE sensor_logs (
    id          BIGSERIAL PRIMARY KEY,
    bed_id      INT         NOT NULL REFERENCES beds(id),
    event       VARCHAR(50) NOT NULL CHECK (event IN ('connected', 'disconnected', 'invalid_value', 'timeout')),
    detail      TEXT,
    occurred_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES útiles
-- ============================================================
CREATE INDEX idx_vitals_bed_id     ON vitals(bed_id, recorded_at DESC);
CREATE INDEX idx_alerts_bed_id     ON alerts(bed_id);
CREATE INDEX idx_sensor_logs_bed   ON sensor_logs(bed_id, occurred_at DESC);
CREATE INDEX idx_audit_log_user    ON audit_log(user_id, occurred_at DESC);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Usuarios (passwords reales hashadas con bcrypt cost=10)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin',             'admin@healthsync.com',      '$2a$10$tf6T0wHljnP8NxG1xPhQfeVUq0mL0Vz3AMOWon17yUMECh2WttXka', 'admin'),     
  ('Dr. Juan Pérez',    'medico1@healthsync.com',    '$2a$10$UBs3eXf9dFWLGSUBdvNvweSsnAXgwSt72wDGp6SEfWG1VDhKeegLK', 'medico'),    
  ('Dra. Laura García', 'medico2@healthsync.com',    '$2a$10$tG1UMnffW8q48MprK38eFuwRlwAQIyB0gEWmJHO.ZESIzn5oOZqqq', 'medico'),    
  ('Dr. Andrés López',  'medico3@healthsync.com',    '$2a$10$AJCUZMUnbRMcMlLIiuJd2eFAgEhyR1x1m3ikOzKaE8VrMycp60eRi', 'medico'),    
  ('Enf. Sandra Ruiz',  'enfermero1@healthsync.com', '$2a$10$9wM5uOGAGAh2k2DGhO6cD.xL3JZ4CS3UV.dU2Xv4a0OuDA7ZKfCmu', 'enfermero'), 
  ('Enf. Diego Soto',   'enfermero2@healthsync.com', '$2a$10$dc0Glxxgx4Jn7BRmpcQrIuMpsYDW4GP7V.x.0rN/L.HikwT3/r7Gq', 'enfermero'); 


INSERT INTO beds (code, status, auto_simulate)
SELECT
  'CAMA-' || LPAD(g::text, 3, '0'),
  CASE WHEN g <= 5 THEN 'active' ELSE 'inactive' END,
  (g <= 5)
FROM generate_series(1, 100) g;

INSERT INTO patients (full_name, document_id, birth_date, blood_type)
SELECT
  (ARRAY['Juan','Carlos','María','Ana','Pedro','Sofía','Luis','Diana','Jorge','Carmen'])[((g - 1) % 10) + 1]
    || ' ' ||
  (ARRAY['Pérez','García','López','Martínez','Sánchez','González','Rodríguez','Fernández','Torres','Ruiz'])[(((g - 1) / 10) % 10) + 1],
  'DOC-' || LPAD(g::text, 4, '0'),
  DATE '1960-01-01' + ((g * 137) % 20000),
  (ARRAY['O+','O-','A+','A-','B+','B-','AB+','AB-'])[((g - 1) % 8) + 1]
FROM generate_series(1, 100) g;

INSERT INTO bed_assignments (bed_id, patient_id, assigned_user_id, assigned_at)
SELECT
  g,                                                   -- bed_id (= número de cama)
  g,                                                   -- patient_id (= número de paciente)
  ((g - 1) % 5) + 2,                                   -- assigned_user_id: rota entre 2 y 6
  NOW() - ((g * 2)::text || ' hours')::INTERVAL        -- assigned_at variado
FROM generate_series(1, 100) g;
