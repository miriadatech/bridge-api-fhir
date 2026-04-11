-- =============================================================================
-- BRIDGE API FHIR v2.0.0 - SCRIPT COMPLETO DE BASE DE DATOS (CORREGIDO)
-- =============================================================================
-- Orden correcto de creación de tablas para evitar conflictos de Foreign Keys
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONES NECESARIAS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. TABLA: USERS (DEBE SER PRIMERA - Base de referencias)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, doctor, nurse, patient, lab_technician
    specialty VARCHAR(100), -- Para doctors: Cardiología, Neurología, etc.
    license_number VARCHAR(50), -- Número de cédula profesional
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_specialty ON users(specialty);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- =============================================================================
-- 3. TABLA: PATIENTS (DEBE SER SEGUNDA)
-- =============================================================================

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    family_name VARCHAR(100) NOT NULL,
    given_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    gender VARCHAR(50) NOT NULL, -- male, female, other, unknown
    birth_date DATE NOT NULL,
    marital_status VARCHAR(50), -- married, single, divorced, widowed, unknown
    identifier_type VARCHAR(50) DEFAULT 'CC', -- CC, TI, Passport, etc.
    identifier_value VARCHAR(50) UNIQUE NOT NULL,
    
    -- Contacto
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Dirección
    address_line VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_postal_code VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'Colombia',
    
    -- Información médica básica
    blood_type VARCHAR(10), -- O+, O-, A+, A-, B+, B-, AB+, AB-
    rh_type VARCHAR(5), -- +, -
    ethnicity VARCHAR(100), -- Afrodescendiente, Indígena, etc.
    disability_status BOOLEAN DEFAULT FALSE,
    
    -- Emergencia
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Preferencias
    preferred_language VARCHAR(50) DEFAULT 'es',
    communication_preference VARCHAR(50) DEFAULT 'email', -- email, phone, sms
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_patients_identifier ON patients(identifier_type, identifier_value);
CREATE INDEX idx_patients_name ON patients(family_name, given_name);
CREATE INDEX idx_patients_birth_date ON patients(birth_date);
CREATE INDEX idx_patients_city ON patients(address_city);
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_blood_type ON patients(blood_type);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

-- =============================================================================
-- 4. TABLA: ALLERGIES (Alergias)
-- =============================================================================

CREATE TABLE IF NOT EXISTS allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergen VARCHAR(255) NOT NULL, -- Penicilina, Aspirina, etc.
    allergen_code VARCHAR(50), -- SNOMED CT code
    allergen_type VARCHAR(50) NOT NULL, -- medication, food, environment, latex, etc.
    severity VARCHAR(50) NOT NULL DEFAULT 'unknown', -- mild, moderate, severe, unknown
    reaction_description TEXT, -- Rash, anafilaxia, etc.
    onset_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, resolved
    last_occurrence DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_allergies_patient_id ON allergies(patient_id);
CREATE INDEX idx_allergies_allergen ON allergies(allergen);
CREATE INDEX idx_allergies_status ON allergies(status);
CREATE INDEX idx_allergies_severity ON allergies(severity);

-- =============================================================================
-- 5. TABLA: MEDICAL_CONDITIONS (Problemas/Condiciones médicas)
-- =============================================================================

CREATE TABLE IF NOT EXISTS medical_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    condition_code VARCHAR(50) NOT NULL, -- ICD-10 code
    condition_display VARCHAR(255) NOT NULL,
    condition_category VARCHAR(100), -- Cardiovascular, Endocrine, Neurological, etc.
    
    -- Detalles clínicos
    onset_date DATE,
    resolution_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, remission, resolved
    severity VARCHAR(50), -- mild, moderate, severe
    clinical_status VARCHAR(50) DEFAULT 'active', -- active, recurrence, relapse, inactive, remission, resolved
    
    -- Notas
    clinical_notes TEXT,
    recorder_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_conditions_patient_id ON medical_conditions(patient_id);
CREATE INDEX idx_conditions_code ON medical_conditions(condition_code);
CREATE INDEX idx_conditions_status ON medical_conditions(status);
CREATE INDEX idx_conditions_category ON medical_conditions(condition_category);

-- =============================================================================
-- 6. TABLA: ENCOUNTERS (Encuentros clínicos)
-- =============================================================================

CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Información del encuentro
    status VARCHAR(50) NOT NULL DEFAULT 'finished',
    encounter_type VARCHAR(100) NOT NULL DEFAULT 'consultation',
    encounter_class VARCHAR(50), -- inpatient, outpatient, ambulatory, emergency, virtual
    
    -- Tiempos
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    
    -- Ubicación
    location VARCHAR(255),
    location_type VARCHAR(100), -- clinic, hospital, home, telemedicine, etc.
    
    -- Clínico
    chief_complaint TEXT,
    reason_for_visit TEXT,
    diagnosis TEXT, -- JSON array
    assessment TEXT,
    plan TEXT,
    treatment_plan TEXT, -- JSON
    
    -- Notas
    clinical_notes TEXT,
    follow_up_notes TEXT,
    
    -- Virtual
    is_virtual BOOLEAN DEFAULT FALSE,
    virtual_meeting_url VARCHAR(255),
    virtual_platform VARCHAR(100), -- Zoom, Teams, etc.
    
    -- Referencias
    referred_from VARCHAR(255),
    referred_to VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX idx_encounters_practitioner_id ON encounters(practitioner_id);
CREATE INDEX idx_encounters_status ON encounters(status);
CREATE INDEX idx_encounters_type ON encounters(encounter_type);
CREATE INDEX idx_encounters_start_time ON encounters(start_time DESC);
CREATE INDEX idx_encounters_created_at ON encounters(created_at DESC);
CREATE INDEX idx_encounters_patient_date ON encounters(patient_id, start_time DESC);

-- =============================================================================
-- 7. TABLA: VITAL_SIGNS (Signos Vitales)
-- =============================================================================

CREATE TABLE IF NOT EXISTS vital_signs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Vitales comunes
    systolic_bp NUMERIC(5,1), -- mmHg
    diastolic_bp NUMERIC(5,1), -- mmHg
    heart_rate INT, -- /min
    respiratory_rate INT, -- /min
    temperature NUMERIC(5,2), -- °C
    oxygen_saturation NUMERIC(5,2), -- %
    weight NUMERIC(8,2), -- kg
    height NUMERIC(6,2), -- cm
    bmi NUMERIC(6,2), -- Body Mass Index
    
    -- Adicionales
    blood_glucose NUMERIC(8,2), -- mg/dL
    pain_scale INT, -- 0-10
    consciousness_level VARCHAR(100), -- Alert, Lethargic, Stuporous, Comatose
    
    measurement_time TIMESTAMP NOT NULL,
    measurement_method VARCHAR(100), -- Manual, Automatic, etc.
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vital_signs_encounter_id ON vital_signs(encounter_id);
CREATE INDEX idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_measurement_time ON vital_signs(measurement_time DESC);
CREATE INDEX idx_vital_signs_patient_time ON vital_signs(patient_id, measurement_time DESC);

-- =============================================================================
-- 8. TABLA: MEDICATIONS (Medicamentos)
-- =============================================================================

CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    generic_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    medication_code VARCHAR(50), -- RxNorm code
    atc_code VARCHAR(50), -- Anatomical Therapeutic Chemical
    
    -- Presentación
    dosage_form VARCHAR(100), -- Tablet, Capsule, Injection, Liquid, etc.
    strength VARCHAR(100), -- "500mg", "10 mg/5 mL"
    
    -- Propiedades
    therapeutic_class VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medications_generic_name ON medications(generic_name);
CREATE INDEX idx_medications_brand_name ON medications(brand_name);
CREATE INDEX idx_medications_code ON medications(medication_code);

-- =============================================================================
-- 9. TABLA: MEDICATION_ORDERS (Órdenes/Prescripciones)
-- =============================================================================

CREATE TABLE IF NOT EXISTS medication_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    prescriber_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
    
    -- Dosis
    dose_quantity NUMERIC(10,2),
    dose_unit VARCHAR(50), -- mg, mL, tablet, etc.
    frequency VARCHAR(100), -- "2 veces al día", "cada 8 horas", etc.
    frequency_code VARCHAR(50), -- BID, TID, QID, QH, etc.
    route VARCHAR(50), -- oral, intravenous, intramuscular, topical, etc.
    
    -- Duración
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    duration_days INT,
    
    -- Indicaciones
    reason_for_medication TEXT,
    indication_code VARCHAR(50),
    
    -- Estado
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, stopped, on-hold, entered-in-error
    
    -- Instrucciones
    instructions TEXT,
    refills_allowed INT,
    refills_used INT DEFAULT 0,
    
    -- Substitución
    substitution_allowed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discontinued_date TIMESTAMP,
    discontinued_reason VARCHAR(255)
);

CREATE INDEX idx_medication_orders_patient_id ON medication_orders(patient_id);
CREATE INDEX idx_medication_orders_prescriber_id ON medication_orders(prescriber_id);
CREATE INDEX idx_medication_orders_encounter_id ON medication_orders(encounter_id);
CREATE INDEX idx_medication_orders_status ON medication_orders(status);
CREATE INDEX idx_medication_orders_start_date ON medication_orders(start_date DESC);

-- =============================================================================
-- 10. TABLA: MEDICATION_ADHERENCE (Adherencia a medicamentos)
-- =============================================================================

CREATE TABLE IF NOT EXISTS medication_adherence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_order_id UUID NOT NULL REFERENCES medication_orders(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Registro de toma
    scheduled_date DATE NOT NULL,
    actually_taken BOOLEAN,
    taken_time TIME,
    dosage_taken NUMERIC(10,2),
    
    -- Razones de no cumplimiento
    non_compliance_reason VARCHAR(255), -- Side effects, Cost, Forgot, etc.
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_med_adherence_patient_id ON medication_adherence(patient_id);
CREATE INDEX idx_med_adherence_order_id ON medication_adherence(medication_order_id);
CREATE INDEX idx_med_adherence_scheduled_date ON medication_adherence(scheduled_date DESC);

-- =============================================================================
-- 11. TABLA: DEVICES (Dispositivos) - DEBE VENIR ANTES DE PROCEDURES
-- =============================================================================

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    device_type VARCHAR(100) NOT NULL, -- Implant, Monitor, Pump, Wheelchair, etc.
    device_code VARCHAR(50), -- SNOMED CT code
    device_display VARCHAR(255),
    
    -- Fabricante
    manufacturer VARCHAR(255),
    model_number VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    
    -- Especificaciones
    specification_details TEXT, -- JSON
    
    -- Estado
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, entered-in-error
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devices_device_type ON devices(device_type);
CREATE INDEX idx_devices_status ON devices(status);

-- =============================================================================
-- 12. TABLA: SPECIMENS (Especímenes) - DEBE VENIR ANTES DE LABORATORY_RESULTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS specimens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Tipo
    specimen_type VARCHAR(100) NOT NULL, -- Blood, Urine, Saliva, Tissue, etc.
    specimen_code VARCHAR(50), -- SNOMED CT code
    
    -- Recolección
    collection_date_time TIMESTAMP NOT NULL,
    collection_method VARCHAR(100), -- Needle aspiration, Venipuncture, etc.
    collection_site VARCHAR(255), -- Left arm, Right arm, etc.
    collected_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Preservación
    preservation_method VARCHAR(100), -- Refrigerated, Frozen, Room temperature
    preservation_material VARCHAR(100), -- EDTA, SST, FFPE, etc.
    
    -- Cantidad
    quantity_value NUMERIC(10,2),
    quantity_unit VARCHAR(50), -- mL, grams, etc.
    
    -- Estado
    status VARCHAR(50) NOT NULL DEFAULT 'available', -- available, unavailable, unsatisfactory, entered-in-error
    status_reason VARCHAR(255),
    
    -- Recepción en laboratorio
    received_date_time TIMESTAMP,
    condition_at_receipt VARCHAR(100), -- Satisfactory, Hemolyzed, Clotted, etc.
    
    -- Destino
    processing_started_date TIMESTAMP,
    processing_completed_date TIMESTAMP,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_specimens_patient_id ON specimens(patient_id);
CREATE INDEX idx_specimens_type ON specimens(specimen_type);
CREATE INDEX idx_specimens_collection_date ON specimens(collection_date_time DESC);
CREATE INDEX idx_specimens_status ON specimens(status);

-- =============================================================================
-- 13. TABLA: PROCEDURES (Procedimientos)
-- =============================================================================

CREATE TABLE IF NOT EXISTS procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Procedimiento
    procedure_code VARCHAR(50) NOT NULL, -- CPT code
    procedure_display VARCHAR(255) NOT NULL,
    procedure_category VARCHAR(100), -- Diagnostic, Therapeutic, Preventive
    
    -- Tiempos
    performed_date_time TIMESTAMP NOT NULL,
    duration_minutes INT,
    
    -- Estado
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- preparation, in-progress, not-done, on-hold, stopped, completed, entered-in-error, unknown
    status_reason VARCHAR(255),
    
    -- Ubicación
    location VARCHAR(255),
    
    -- Detalles
    reason_for_procedure TEXT,
    outcome TEXT,
    complication TEXT,
    
    -- Materiales
    used_materials TEXT, -- JSON array
    
    -- Notas
    notes TEXT,
    
    -- Seguimiento
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_instructions TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_procedures_patient_id ON procedures(patient_id);
CREATE INDEX idx_procedures_encounter_id ON procedures(encounter_id);
CREATE INDEX idx_procedures_code ON procedures(procedure_code);
CREATE INDEX idx_procedures_performed_date ON procedures(performed_date_time DESC);

-- =============================================================================
-- 14. TABLA: LABORATORY_RESULTS (Resultados de laboratorio) - AHORA FUNCIONA
-- =============================================================================

CREATE TABLE IF NOT EXISTS laboratory_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Test
    test_code VARCHAR(50) NOT NULL, -- LOINC code
    test_display VARCHAR(255) NOT NULL,
    test_category VARCHAR(100), -- Hematology, Chemistry, Microbiology, etc.
    
    -- Resultado
    result_value VARCHAR(100),
    result_numeric NUMERIC(15,5),
    result_unit VARCHAR(50),
    result_text TEXT,
    result_code VARCHAR(50),
    
    -- Referencia
    reference_range_low NUMERIC(15,5),
    reference_range_high NUMERIC(15,5),
    reference_range_text VARCHAR(255),
    
    -- Interpretación
    status VARCHAR(50) NOT NULL DEFAULT 'final', -- registered, preliminary, final, amended, corrected, cancelled
    interpretation VARCHAR(50), -- normal, low, high, critical
    abnormal_flag BOOLEAN DEFAULT FALSE,
    
    -- Especimen
    specimen_type VARCHAR(100), -- Blood, Urine, Saliva, etc.
    specimen_id UUID REFERENCES specimens(id) ON DELETE SET NULL,
    
    -- Tiempos
    collection_time TIMESTAMP,
    received_time TIMESTAMP,
    analysis_time TIMESTAMP,
    result_time TIMESTAMP,
    
    -- Método
    method VARCHAR(255),
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    
    -- Notas
    clinical_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_lab_results_patient_id ON laboratory_results(patient_id);
CREATE INDEX idx_lab_results_encounter_id ON laboratory_results(encounter_id);
CREATE INDEX idx_lab_results_test_code ON laboratory_results(test_code);
CREATE INDEX idx_lab_results_result_time ON laboratory_results(result_time DESC);
CREATE INDEX idx_lab_results_abnormal ON laboratory_results(abnormal_flag);
CREATE INDEX idx_lab_results_specimen_id ON laboratory_results(specimen_id);

-- =============================================================================
-- 15. TABLA: OBSERVATIONS (Observaciones clínicas)
-- =============================================================================

CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Códigos
    observation_code VARCHAR(100) NOT NULL, -- LOINC code
    observation_display VARCHAR(255) NOT NULL,
    observation_category VARCHAR(100) NOT NULL, -- vital-signs, laboratory, imaging, survey, procedure, social-history, etc.
    
    -- Valor
    value_string TEXT,
    value_numeric NUMERIC(15,5),
    value_unit VARCHAR(50),
    value_code VARCHAR(50),
    value_boolean BOOLEAN,
    value_datetime TIMESTAMP,
    value_range_low NUMERIC(15,5),
    value_range_high NUMERIC(15,5),
    
    -- Resultado
    status VARCHAR(50) NOT NULL DEFAULT 'final', -- registered, preliminary, final, amended, corrected, cancelled, entered-in-error
    
    -- Referencia
    reference_range_low NUMERIC(15,5),
    reference_range_high NUMERIC(15,5),
    reference_range_text VARCHAR(255),
    
    -- Interpretación
    interpretation VARCHAR(50), -- normal, low, high, critical
    
    -- Tiempos
    effective_date TIMESTAMP NOT NULL,
    issued TIMESTAMP,
    
    -- Método y dispositivo
    method VARCHAR(255),
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    
    -- Especimen
    specimen_id UUID REFERENCES specimens(id) ON DELETE SET NULL,
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_observations_patient_id ON observations(patient_id);
CREATE INDEX idx_observations_encounter_id ON observations(encounter_id);
CREATE INDEX idx_observations_code ON observations(observation_code);
CREATE INDEX idx_observations_category ON observations(observation_category);
CREATE INDEX idx_observations_effective_date ON observations(effective_date DESC);
CREATE INDEX idx_observations_patient_date ON observations(patient_id, effective_date DESC);
CREATE INDEX idx_observations_device_id ON observations(device_id);
CREATE INDEX idx_observations_specimen_id ON observations(specimen_id);

-- =============================================================================
-- 16. TABLA: IMMUNIZATIONS (Inmunizaciones)
-- =============================================================================

CREATE TABLE IF NOT EXISTS immunizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    
    -- Vacuna
    vaccine_code VARCHAR(50) NOT NULL, -- CVX code
    vaccine_display VARCHAR(255) NOT NULL,
    vaccine_lot_number VARCHAR(50),
    vaccine_expiration_date DATE,
    
    -- Administración
    administration_date DATE NOT NULL,
    route VARCHAR(50), -- Oral, Intramuscular, etc.
    site VARCHAR(100), -- Left arm, Right arm, Buttock, etc.
    
    -- Dosis
    dose_quantity NUMERIC(10,2),
    dose_unit VARCHAR(50),
    dose_sequence INT, -- 1, 2, 3, etc. para series
    
    -- Resultado
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- completed, entered-in-error, not-done
    status_reason VARCHAR(255),
    
    -- Reacciones
    reaction TEXT,
    reaction_reported BOOLEAN DEFAULT FALSE,
    
    -- Próxima dosis
    next_dose_due_date DATE,
    
    -- Información adicional
    manufacturer VARCHAR(100),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_immunizations_patient_id ON immunizations(patient_id);
CREATE INDEX idx_immunizations_vaccine_code ON immunizations(vaccine_code);
CREATE INDEX idx_immunizations_admin_date ON immunizations(administration_date DESC);

-- =============================================================================
-- 17. TABLA: PATIENT_DEVICES (Dispositivos del paciente)
-- =============================================================================

CREATE TABLE IF NOT EXISTS patient_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    
    -- Información de implantación
    implantation_date DATE,
    implantation_site VARCHAR(255),
    implantation_procedure_id UUID REFERENCES procedures(id) ON DELETE SET NULL,
    
    -- Monitoreo
    expiration_date DATE,
    replacement_date DATE,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active', -- active, malfunctioning, removed
    status_reason VARCHAR(255),
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_patient_devices_patient_id ON patient_devices(patient_id);
CREATE INDEX idx_patient_devices_device_id ON patient_devices(device_id);
CREATE INDEX idx_patient_devices_status ON patient_devices(status);

-- =============================================================================
-- 18. TABLA: CLINICAL_NOTES (Notas clínicas)
-- =============================================================================

CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Tipo de nota
    note_type VARCHAR(100) NOT NULL, -- Progress, Soap, Discharge, Consultation, etc.
    
    -- Contenido
    subject_of_record TEXT, -- Resumen del paciente
    note_content TEXT NOT NULL,
    
    -- Formato
    note_format VARCHAR(50) DEFAULT 'text', -- text, markdown, html
    
    -- Privacidad
    is_confidential BOOLEAN DEFAULT FALSE,
    access_restricted BOOLEAN DEFAULT FALSE,
    restricted_access_list UUID[], -- IDs de usuarios con acceso
    
    -- Estado
    status VARCHAR(50) NOT NULL DEFAULT 'in-progress', -- preliminary, final, amended, entered-in-error
    
    -- Auditoría
    edited_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    edit_reason VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signed_at TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_clinical_notes_patient_id ON clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_encounter_id ON clinical_notes(encounter_id);
CREATE INDEX idx_clinical_notes_author_id ON clinical_notes(author_id);
CREATE INDEX idx_clinical_notes_note_type ON clinical_notes(note_type);
CREATE INDEX idx_clinical_notes_created_at ON clinical_notes(created_at DESC);

-- =============================================================================
-- 19. TABLA: AUDIT_LOGS (Registro de auditoría)
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- CREATE, READ, UPDATE, DELETE, EXPORT, DOWNLOAD
    resource_type VARCHAR(100) NOT NULL, -- Patient, Encounter, Medication, etc.
    resource_id UUID,
    resource_name VARCHAR(255),
    
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    
    status VARCHAR(50) NOT NULL DEFAULT 'success', -- success, failure
    error_message TEXT,
    
    compliance_flag VARCHAR(50), -- hipaa_audit, gdpr_audit, etc.
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- =============================================================================
-- 20. TABLA: CHANGE_TRACKING (Tracking de cambios)
-- =============================================================================

CREATE TABLE IF NOT EXISTS change_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    
    change_type VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    changed_fields TEXT, -- JSON array of field names
    old_value TEXT, -- JSON
    new_value TEXT, -- JSON
    
    changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    change_reason VARCHAR(255),
    
    sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, failed
    sync_timestamp TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_tracking_entity ON change_tracking(entity_type, entity_id);
CREATE INDEX idx_change_tracking_timestamp ON change_tracking(created_at DESC);
CREATE INDEX idx_change_tracking_sync ON change_tracking(sync_status);

-- =============================================================================
-- 21. TABLA: SYSTEM_LOGS (Logs del sistema)
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    log_level VARCHAR(50) NOT NULL, -- INFO, WARNING, ERROR, DEBUG
    log_category VARCHAR(100), -- Database, API, Auth, Integration, etc.
    log_message TEXT NOT NULL,
    
    stack_trace TEXT,
    
    service_name VARCHAR(100),
    service_version VARCHAR(20),
    
    correlation_id VARCHAR(100), -- Para trazar requests
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_category ON system_logs(log_category);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_correlation ON system_logs(correlation_id);

-- =============================================================================
-- 22. TABLA: INTEGRATION_LOGS (Logs de integraciones)
-- =============================================================================

CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    integration_name VARCHAR(100) NOT NULL, -- MinSalud, Legacy System, etc.
    integration_endpoint VARCHAR(500),
    
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_headers TEXT, -- JSON (sin credenciales)
    request_payload TEXT, -- JSON
    
    response_status_code INT,
    response_headers TEXT, -- JSON
    response_payload TEXT, -- JSON
    
    error_message TEXT,
    
    execution_time_ms INT,
    retry_count INT DEFAULT 0,
    
    status VARCHAR(50), -- success, failure, timeout
    
    correlation_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integration_logs_name ON integration_logs(integration_name);
CREATE INDEX idx_integration_logs_status ON integration_logs(status);
CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at DESC);

-- =============================================================================
-- 23. TABLA: NOTIFICATIONS (Notificaciones)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    notification_type VARCHAR(100) NOT NULL, -- appointment_reminder, result_ready, message, alert, etc.
    notification_category VARCHAR(50), -- clinical, administrative, system
    
    title VARCHAR(255),
    message TEXT,
    data TEXT, -- JSON with additional info
    
    related_resource_type VARCHAR(100), -- Patient, Encounter, Result, etc.
    related_resource_id UUID,
    
    status VARCHAR(50) DEFAULT 'unread', -- unread, read, archived
    
    delivery_method VARCHAR(50) DEFAULT 'in-app', -- in-app, email, sms, push
    delivery_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    delivery_time TIMESTAMP,
    
    scheduled_for TIMESTAMP,
    
    is_urgent BOOLEAN DEFAULT FALSE,
    require_acknowledgment BOOLEAN DEFAULT FALSE,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================================================
-- 24. TABLA: API_KEYS (Claves API para integraciones)
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    
    scopes TEXT, -- JSON array
    
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- =============================================================================
-- DATOS DE EJEMPLO
-- =============================================================================

-- ============================================================================= 
-- USUARIOS
-- =============================================================================

INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, specialty, license_number, is_email_verified)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@bridge.local', '$2b$10$YOixf/3XWt8oCy/E7dBbVONv7YdAYDlCX7D3fVR3VPW3SQZbQsqbK', 'Administrador', 'Sistema', '+57-300-000-0001', 'admin', NULL, 'ADM-001', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'doctor.juan@bridge.local', '$2b$10$YOixf/3XWt8oCy/E7dBbVONv7YdAYDlCX7D3fVR3VPW3SQZbQsqbK', 'Juan', 'García Méndez', '+57-300-111-1111', 'doctor', 'Cardiología', 'MED-001', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'nurse.maria@bridge.local', '$2b$10$YOixf/3XWt8oCy/E7dBbVONv7YdAYDlCX7D3fVR3VPW3SQZbQsqbK', 'María', 'López Rodríguez', '+57-300-222-2222', 'nurse', NULL, 'ENF-001', TRUE),
    ('00000000-0000-0000-0000-000000000004', 'doctor.carlos@bridge.local', '$2b$10$YOixf/3XWt8oCy/E7dBbVONv7YdAYDlCX7D3fVR3VPW3SQZbQsqbK', 'Carlos', 'Martínez Silva', '+57-300-333-3333', 'doctor', 'Endocrinología', 'MED-002', TRUE),
    ('00000000-0000-0000-0000-000000000005', 'nurse.ana@bridge.local', '$2b$10$YOixf/3XWt8oCy/E7dBbVONv7YdAYDlCX7D3fVR3VPW3SQZbQsqbK', 'Ana', 'Sánchez González', '+57-300-444-4444', 'nurse', NULL, 'ENF-002', TRUE),
    ('00000000-0000-0000-0000-000000000006', 'lab.tech@bridge.local', '$2b$10$YOixf/3XWt8oCy/E7dBbVONv7YdAYDlCX7D3fVR3VPW3SQZbQsqbK', 'Roberto', 'Fernández López', '+57-300-555-5555', 'lab_technician', NULL, 'LAB-001', TRUE);

-- =============================================================================
-- PACIENTES
-- =============================================================================

INSERT INTO patients (id, family_name, given_name, middle_name, gender, birth_date, marital_status, identifier_type, identifier_value, contact_email, contact_phone, address_line, address_city, address_state, address_postal_code, blood_type, rh_type, is_active)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Rodríguez', 'Pedro', 'Alfonso', 'male', '1975-03-15', 'married', 'CC', '12345678-1', 'pedro@email.com', '+57-301-123-4567', 'Calle 45 # 23-45', 'Bogotá', 'Cundinamarca', '110221', 'O', '+', TRUE),
    ('10000000-0000-0000-0000-000000000002', 'Martínez', 'Claudia', 'Elena', 'female', '1982-07-22', 'single', 'CC', '87654321-2', 'claudia@email.com', '+57-312-456-7890', 'Carrera 80 # 50-20', 'Medellín', 'Antioquia', '050021', 'A', '-', TRUE),
    ('10000000-0000-0000-0000-000000000003', 'Sánchez', 'Javier', 'Luis', 'male', '1990-11-08', 'married', 'CC', '56789012-3', 'javier@email.com', '+57-318-765-4321', 'Avenida 6ª # 100-50', 'Cali', 'Valle del Cauca', '760001', 'B', '+', TRUE),
    ('10000000-0000-0000-0000-000000000004', 'García', 'Rosa María', 'del Carmen', 'female', '1968-01-30', 'widowed', 'CC', '34567890-4', 'rosa@email.com', '+57-321-098-7654', 'Calle 82 # 46-45', 'Barranquilla', 'Atlántico', '080001', 'AB', '+', TRUE),
    ('10000000-0000-0000-0000-000000000005', 'López', 'Andrés Felipe', 'Miguel', 'male', '1995-06-12', 'single', 'CC', '23456789-5', 'andres@email.com', '+57-310-567-8901', 'Carrera 19 # 35-40', 'Bucaramanga', 'Santander', '680001', 'O', '-', TRUE);

-- =============================================================================
-- ALERGIAS
-- =============================================================================

INSERT INTO allergies (id, patient_id, allergen, allergen_type, severity, reaction_description, onset_date, status, created_by)
VALUES
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Penicilina', 'medication', 'moderate', 'Urticaria y angioedema', '2010-05-20', 'active', '00000000-0000-0000-0000-000000000001'),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Aspirina', 'medication', 'mild', 'Sensibilidad gástrica', '2015-03-10', 'active', '00000000-0000-0000-0000-000000000002'),
    ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Sulfamidas', 'medication', 'severe', 'Síndrome de Stevens-Johnson (antecedente)', '2008-02-14', 'active', '00000000-0000-0000-0000-000000000004'),
    ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Ibuprofeno', 'medication', 'mild', 'Molestias gástricas', '2012-11-25', 'active', '00000000-0000-0000-0000-000000000002');

-- =============================================================================
-- CONDICIONES MÉDICAS
-- =============================================================================

INSERT INTO medical_conditions (id, patient_id, condition_code, condition_display, condition_category, onset_date, status, severity, clinical_status, recorder_id)
VALUES
    ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'E11.9', 'Type 2 diabetes mellitus without complications', 'Endocrine', '2012-06-15', 'active', 'moderate', 'active', '00000000-0000-0000-0000-000000000004'),
    ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'E78.5', 'Unspecified dyslipidemia', 'Cardiovascular', '2010-03-20', 'active', 'mild', 'active', '00000000-0000-0000-0000-000000000002'),
    ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'E78.5', 'Unspecified dyslipidemia', 'Cardiovascular', '2015-09-10', 'active', 'moderate', 'active', '00000000-0000-0000-0000-000000000004'),
    ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'I10', 'Essential (primary) hypertension', 'Cardiovascular', '2008-08-05', 'active', 'moderate', 'active', '00000000-0000-0000-0000-000000000002');

-- =============================================================================
-- MEDICAMENTOS
-- =============================================================================

INSERT INTO medications (id, generic_name, brand_name, dosage_form, strength, therapeutic_class, atc_code)
VALUES
    ('60000000-0000-0000-0000-000000000001', 'Metformina', 'Glucophage', 'Tablet', '500mg', 'Antidiabetic', 'A10BA02'),
    ('60000000-0000-0000-0000-000000000002', 'Atorvastatina', 'Lipitor', 'Tablet', '20mg', 'Statin', 'C10AA05'),
    ('60000000-0000-0000-0000-000000000003', 'Lisinopril', 'Carace', 'Tablet', '10mg', 'ACE Inhibitor', 'C09AA01'),
    ('60000000-0000-0000-0000-000000000004', 'Ácido Acetilsalicílico', 'Aspirin', 'Tablet', '81mg', 'Antiplatelet', 'B01AC06'),
    ('60000000-0000-0000-0000-000000000005', 'Amlodipino', 'Norvasc', 'Tablet', '5mg', 'Calcium Channel Blocker', 'C08CA01');

-- =============================================================================
-- ENCUENTROS
-- =============================================================================

INSERT INTO encounters (id, patient_id, practitioner_id, status, encounter_type, start_time, end_time, location, reason_for_visit, chief_complaint)
VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'finished', 'follow-up', '2024-01-15 09:00:00', '2024-01-15 09:30:00', 'Consultorio 101', 'Seguimiento de diabetes', 'Revisión periódica'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'finished', 'consultation', '2024-01-14 14:00:00', '2024-01-14 14:45:00', 'Consultorio 205', 'Manejo de colesterol', 'Evaluación inicial'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'finished', 'emergency', '2024-01-13 22:15:00', '2024-01-13 23:00:00', 'Sala de Urgencias', 'Dolor torácico', 'Chest pain, unspecified'),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'finished', 'follow-up', '2024-01-12 10:30:00', '2024-01-12 11:15:00', 'Consultorio 302', 'Control de presión arterial', 'Control de HTA'),
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'finished', 'consultation', '2024-01-11 16:00:00', '2024-01-11 16:30:00', 'Consultorio 101', 'Examen preventivo', 'Chequeo general');

-- =============================================================================
-- SIGNOS VITALES
-- =============================================================================

INSERT INTO vital_signs (id, encounter_id, patient_id, practitioner_id, systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature, oxygen_saturation, weight, height, bmi, measurement_time)
VALUES
    ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 138, 82, 72, 16, 36.8, 98.5, 78.5, 178, 24.8, '2024-01-15 09:05:00'),
    ('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 132, 78, 68, 16, 36.9, 99.0, 65.0, 165, 23.9, '2024-01-14 14:05:00'),
    ('70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 145, 88, 92, 20, 37.1, 96.0, 82.0, 180, 25.3, '2024-01-13 22:20:00'),
    ('70000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 138, 85, 70, 16, 36.7, 98.8, 62.0, 162, 23.6, '2024-01-12 10:35:00'),
    ('70000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 120, 76, 66, 16, 36.8, 99.2, 75.0, 177, 23.9, '2024-01-11 16:05:00');

-- =============================================================================
-- ÓRDENES DE MEDICAMENTOS
-- =============================================================================

INSERT INTO medication_orders (id, encounter_id, patient_id, prescriber_id, medication_id, dose_quantity, dose_unit, frequency_code, route, start_date, status, reason_for_medication)
VALUES
    ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', 500, 'mg', 'BID', 'oral', '2024-01-15', 'active', 'Type 2 diabetes control'),
    ('80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 20, 'mg', 'QD', 'oral', '2024-01-14', 'active', 'Dyslipidemia management'),
    ('80000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 10, 'mg', 'QD', 'oral', '2024-01-12', 'active', 'Hypertension control'),
    ('80000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000004', 81, 'mg', 'QD', 'oral', '2024-01-12', 'active', 'Antiplatelet therapy');

-- =============================================================================
-- DISPOSITIVOS
-- =============================================================================

INSERT INTO devices (id, device_type, device_code, device_display, manufacturer, model_number, status)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Monitor', 'SNO-12345', 'Blood Pressure Monitor', 'Omron', 'HEM-7120', 'active'),
    ('e0000000-0000-0000-0000-000000000002', 'Glucometer', 'GLU-54321', 'Glucose Meter', 'Accu-Chek', 'Guide', 'active');

-- =============================================================================
-- ESPECÍMENES
-- =============================================================================

INSERT INTO specimens (id, patient_id, specimen_type, collection_date_time, collection_method, collection_site, collected_by_id, preservation_method, preservation_material, quantity_value, quantity_unit, status)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Blood', '2024-01-15 09:10:00', 'Venipuncture', 'Left arm', '00000000-0000-0000-0000-000000000006', 'Room temperature', 'SST', 5, 'mL', 'available'),
    ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Blood', '2024-01-14 14:10:00', 'Venipuncture', 'Right arm', '00000000-0000-0000-0000-000000000006', 'Room temperature', 'EDTA', 3, 'mL', 'available'),
    ('b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Blood', '2024-01-13 22:30:00', 'Venipuncture', 'Left arm', '00000000-0000-0000-0000-000000000006', 'Refrigerated', 'SST', 5, 'mL', 'available');

-- =============================================================================
-- OBSERVACIONES
-- =============================================================================

INSERT INTO observations (id, encounter_id, patient_id, practitioner_id, observation_code, observation_display, observation_category, value_numeric, value_unit, status, effective_date, interpretation, reference_range_low, reference_range_high)
VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '8480-6', 'Systolic blood pressure', 'vital-signs', 138, 'mmHg', 'final', '2024-01-15 09:05:00', 'high', 90, 120),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2085-9', 'Cholesterol [Mass/volume]', 'laboratory', 185, 'mg/dL', 'final', '2024-01-15 09:05:00', 'normal', NULL, 200),
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '2085-9', 'Cholesterol [Mass/volume]', 'laboratory', 245, 'mg/dL', 'final', '2024-01-14 14:05:00', 'high', NULL, 200),
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '32693-5', 'Troponin I.cardiac', 'laboratory', 0.01, 'ng/mL', 'final', '2024-01-13 22:30:00', 'normal', NULL, 0.04),
    ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '8480-6', 'Systolic blood pressure', 'vital-signs', 138, 'mmHg', 'final', '2024-01-12 10:35:00', 'high', 90, 120);

-- =============================================================================
-- PROCEDIMIENTOS
-- =============================================================================

INSERT INTO procedures (id, encounter_id, patient_id, practitioner_id, procedure_code, procedure_display, procedure_category, performed_date_time, status)
VALUES
    ('90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '93000', 'Electrocardiogram', 'Diagnostic', '2024-01-15 09:10:00', 'completed'),
    ('90000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '93000', 'Electrocardiogram', 'Diagnostic', '2024-01-13 22:25:00', 'completed'),
    ('90000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '76700', 'Blood drawing, venipuncture', 'Diagnostic', '2024-01-12 10:40:00', 'completed');

-- =============================================================================
-- INMUNIZACIONES
-- =============================================================================

INSERT INTO immunizations (id, patient_id, practitioner_id, vaccine_code, vaccine_display, administration_date, route, site, dose_sequence, status)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', '141', 'Influenza seasonal, injectable, inactivated', '2023-10-15', 'intramuscular', 'Left arm', 1, 'completed'),
    ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', '161', 'Influenza, injectable, quadrivalent', '2024-01-10', 'intramuscular', 'Right arm', 1, 'completed');

-- =============================================================================
-- RESULTADOS DE LABORATORIO
-- =============================================================================

INSERT INTO laboratory_results (id, encounter_id, patient_id, practitioner_id, test_code, test_display, test_category, result_numeric, result_unit, status, interpretation, specimen_id, result_time)
VALUES
    ('c0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2345-7', 'Glucose [Mass/volume] in Serum or Plasma', 'Chemistry', 145.5, 'mg/dL', 'final', 'high', 'b0000000-0000-0000-0000-000000000001', '2024-01-15 10:30:00'),
    ('c0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2085-9', 'Cholesterol [Mass/volume]', 'Chemistry', 185, 'mg/dL', 'final', 'normal', 'b0000000-0000-0000-0000-000000000001', '2024-01-15 10:30:00'),
    ('c0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', '2085-9', 'Cholesterol [Mass/volume]', 'Chemistry', 245, 'mg/dL', 'final', 'high', 'b0000000-0000-0000-0000-000000000002', '2024-01-14 15:45:00');

-- =============================================================================
-- DISPOSITIVOS DEL PACIENTE
-- =============================================================================

INSERT INTO patient_devices (id, patient_id, device_id, implantation_date, is_active, status)
VALUES
    ('f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '2023-12-01', TRUE, 'active'),
    ('f0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', '2023-12-01', TRUE, 'active');

-- =============================================================================
-- NOTAS CLÍNICAS
-- =============================================================================

INSERT INTO clinical_notes (id, encounter_id, patient_id, author_id, note_type, note_content, status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Progress', 'Paciente diabético tipo 2 en seguimiento. Refiere buena adherencia al tratamiento. Valores de glucosa en rango. Presión arterial elevada, se recomienda monitoreo. Continuar con Metformina.', 'final'),
    ('d0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'Consultation', 'Paciente nueva con antecedente de dislipidemia. Se solicitan exámenes de laboratorio. Iniciando Atorvastatina 20mg diarios. Recomendaciones de ejercicio regular y dieta baja en grasas.', 'final'),
    ('d0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Emergency', 'Paciente presenta dolor torácico atípico de 2 horas. ECG y troponinas normales. Evaluación cardiaca descarta evento agudo. Monitoreo continuo. Requiere seguimiento cardiológico en 48 horas.', 'final');

-- =============================================================================
-- VISTAS ÚTILES
-- =============================================================================

CREATE OR REPLACE VIEW v_patient_summary AS
SELECT
    p.id,
    p.identifier_value,
    p.family_name,
    p.given_name,
    p.birth_date,
    p.gender,
    p.blood_type,
    p.address_city,
    COUNT(DISTINCT e.id) as total_encounters,
    COUNT(DISTINCT o.id) as total_observations,
    MAX(e.start_time) as last_encounter_date,
    COUNT(DISTINCT a.id) as allergy_count,
    COUNT(DISTINCT mc.id) as condition_count
FROM patients p
LEFT JOIN encounters e ON p.id = e.patient_id AND e.deleted_at IS NULL
LEFT JOIN observations o ON p.id = o.patient_id AND o.deleted_at IS NULL
LEFT JOIN allergies a ON p.id = a.patient_id AND a.deleted_at IS NULL
LEFT JOIN medical_conditions mc ON p.id = mc.patient_id AND mc.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.identifier_value, p.family_name, p.given_name, p.birth_date, p.gender, p.blood_type, p.address_city;

CREATE OR REPLACE VIEW v_patient_medications_active AS
SELECT
    mo.id,
    p.id as patient_id,
    p.family_name,
    p.given_name,
    m.generic_name,
    m.brand_name,
    mo.dose_quantity,
    mo.dose_unit,
    mo.frequency_code,
    mo.route,
    mo.start_date,
    mo.end_date,
    mo.status,
    u.first_name as prescriber
FROM medication_orders mo
JOIN patients p ON mo.patient_id = p.id
JOIN medications m ON mo.medication_id = m.id
LEFT JOIN users u ON mo.prescriber_id = u.id
WHERE mo.status = 'active' AND p.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_recent_lab_results AS
SELECT
    lr.id,
    p.family_name,
    p.given_name,
    p.identifier_value,
    lr.test_display,
    lr.result_numeric,
    lr.result_unit,
    lr.interpretation,
    lr.result_time,
    e.start_time as encounter_date
FROM laboratory_results lr
JOIN patients p ON lr.patient_id = p.id
LEFT JOIN encounters e ON lr.encounter_id = e.id
WHERE lr.result_time >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY lr.result_time DESC;

-- =============================================================================
-- CONFIRMACIÓN DE INICIALIZACIÓN
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ ================================================';
    RAISE NOTICE '✅ BRIDGE API FHIR v2.0.0 - Base de Datos COMPLETA Y CORREGIDA';
    RAISE NOTICE '✅ ================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 TABLAS CREADAS (24 TABLAS):';
    RAISE NOTICE '   ✓ users';
    RAISE NOTICE '   ✓ patients';
    RAISE NOTICE '   ✓ allergies';
    RAISE NOTICE '   ✓ medical_conditions';
    RAISE NOTICE '   ✓ encounters';
    RAISE NOTICE '   ✓ vital_signs';
    RAISE NOTICE '   ✓ medications';
    RAISE NOTICE '   ✓ medication_orders';
    RAISE NOTICE '   ✓ medication_adherence';
    RAISE NOTICE '   ✓ devices';
    RAISE NOTICE '   ✓ specimens ✅ (AHORA FUNCIONA)';
    RAISE NOTICE '   ✓ procedures';
    RAISE NOTICE '   ✓ laboratory_results ✅ (CON FK A SPECIMENS)';
    RAISE NOTICE '   ✓ observations';
    RAISE NOTICE '   ✓ immunizations';
    RAISE NOTICE '   ✓ patient_devices';
    RAISE NOTICE '   ✓ clinical_notes';
    RAISE NOTICE '   ✓ audit_logs';
    RAISE NOTICE '   ✓ change_tracking';
    RAISE NOTICE '   ✓ system_logs';
    RAISE NOTICE '   ✓ integration_logs';
    RAISE NOTICE '   ✓ notifications';
    RAISE NOTICE '   ✓ api_keys';
    RAISE NOTICE '';
    RAISE NOTICE '👥 DATOS CARGADOS:';
    RAISE NOTICE '   • 6 Usuarios (1 admin, 2 doctors, 2 nurses, 1 lab_tech)';
    RAISE NOTICE '   • 5 Pacientes';
    RAISE NOTICE '   • 4 Alergias';
    RAISE NOTICE '   • 4 Condiciones médicas';
    RAISE NOTICE '   • 5 Encuentros';
    RAISE NOTICE '   • 5 Signos vitales';
    RAISE NOTICE '   • 5 Medicamentos';
    RAISE NOTICE '   • 4 Órdenes de medicamentos';
    RAISE NOTICE '   • 2 Dispositivos';
    RAISE NOTICE '   • 3 Especímenes';
    RAISE NOTICE '   • 5 Observaciones';
    RAISE NOTICE '   • 3 Procedimientos';
    RAISE NOTICE '   • 2 Inmunizaciones';
    RAISE NOTICE '   • 3 Resultados de laboratorio';
    RAISE NOTICE '   • 2 Dispositivos del paciente';
    RAISE NOTICE '   • 3 Notas clínicas';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 USUARIO ADMIN:';
    RAISE NOTICE '   Email: admin@bridge.local';
    RAISE NOTICE '   Password: Admin123!';
    RAISE NOTICE '';
    RAISE NOTICE '📈 VISTAS CREADAS:';
    RAISE NOTICE '   ✓ v_patient_summary';
    RAISE NOTICE '   ✓ v_patient_medications_active';
    RAISE NOTICE '   ✓ v_recent_lab_results';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================';
END $$;

