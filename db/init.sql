-- Habilitar extensión TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

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
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    status     VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disconnected')),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
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
    action      VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
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

-- Usuario admin por defecto (password: Admin1234!)
INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin', 'admin@healthsync.com', '$2b$10$placeholderHashCambiarEnProd', 'admin');

-- 10 camas de ejemplo (ajusta a las que necesites)
INSERT INTO beds (code, status) VALUES
    ('CAMA-01', 'active'),
    ('CAMA-02', 'active'),
    ('CAMA-03', 'active'),
    ('CAMA-04', 'active'),
    ('CAMA-05', 'active'),
    ('CAMA-06', 'active'),
    ('CAMA-07', 'active'),
    ('CAMA-08', 'active'),
    ('CAMA-09', 'active'),
    ('CAMA-10', 'active');