export interface RDAPatientInput {
    id: string;
    given_name: string;
    family_name: string;
    father_family_name?: string | null;
    mother_family_name?: string | null;
    middle_name?: string | null;
    gender: string;
    birth_date: string | null;
    birth_time?: string | null;
    identifier_type: string;
    identifier_value: string;
    contact_phone?: string | null;
    contact_email?: string | null;
    address_line?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_country?: string | null;
    address_postal_code?: string | null;
    divipola_code?: string | null;
    residence_zone_code?: string | null;
    blood_type?: string | null;
    rh_type?: string | null;
    marital_status?: string | null;
    nationality_code?: string | null;
    ethnicity_code?: string | null;
    disability_code?: string | null;
    gender_identity_code?: string | null;
    biological_gender_code?: string | null;
    deceased?: boolean;
}

export interface RDATenantInput {
    id: string;
    name: string;
    nit?: string | null;
    institution_code?: string | null;
}

export interface RDAConsultationInput {
    id: string;
    encounter_id?: string | null;
    consultation_code?: string | null;
    consultation_type: string;
    specialty: string;
    doctor_name: string;
    doctor_license?: string | null;
    institution_name?: string | null;
    institution_code?: string | null;
    consultation_date: Date | string;
    next_appointment?: Date | string | null;
    reason: string;
    reason_for_visit?: string | null;
    chief_complaint?: string | null;
    symptoms?: string | null;
    diagnosis_code?: string | null;
    diagnosis_desc?: string | null;
    assessment?: string | null;
    treatment_plan?: string | null;
    plan?: string | null;
    notes?: string | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    temperature_c?: number | null;
    blood_pressure?: string | null;
    heart_rate?: number | null;
    oxygen_saturation?: number | null;
}

export interface RDAPrescriptionInput {
    id: string;
    medication_name: string;
    medication_code?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    route?: string | null;
    instructions?: string | null;
}

export interface RDALabOrderInput {
    id: string;
    exam_name: string;
    exam_code?: string | null;
    exam_type?: string | null;
    priority?: string | null;
    instructions?: string | null;
    status?: string | null;
}

export interface RDAPatientStatementInput {
    tenant: RDATenantInput;
    patient: RDAPatientInput;
    consultation: RDAConsultationInput;
    prescriptions: RDAPrescriptionInput[];
    lab_orders: RDALabOrderInput[];
}
