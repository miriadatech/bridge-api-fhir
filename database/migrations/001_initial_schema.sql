-- Crear tablas base
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'patient',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY,
  identifier VARCHAR(255),
  identifier_system VARCHAR(255),
  family_name VARCHAR(255),
  given_name VARCHAR(255),
  gender VARCHAR(20),
  birth_date DATE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(255),
  country VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status VARCHAR(50),
  type VARCHAR(255),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  reason TEXT,
  location VARCHAR(255),
  service_type VARCHAR(255),
  priority VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  code VARCHAR(255),
  code_system VARCHAR(255),
  value TEXT,
  unit VARCHAR(50),
  status VARCHAR(50),
  effective_date TIMESTAMP,
  issued TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX idx_observations_patient_id ON observations(patient_id);
CREATE INDEX idx_observations_encounter_id ON observations(encounter_id);
