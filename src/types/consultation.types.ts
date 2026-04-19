export interface CreateConsultationDTO {
    patient_id: string;
    consultation_type: string;
    specialty: string;
    doctor_name: string;
    doctor_id?: string;
    doctor_license?: string;
    institution_name?: string;
    institution_code?: string;
    consultation_date?: string;
    next_appointment?: string;
    reason: string;
    symptoms?: string;
    diagnosis_code?: string;
    diagnosis_desc?: string;
    treatment_plan?: string;
    notes?: string;
    follow_up_date?: string;
    reason_for_visit?: string;
    chief_complaint?: string;
    assessment?: string;
    plan?: string;
    vital_signs?: {
        blood_pressure?: string;
        heart_rate?: number;
        temperature_c?: number;    // ← corregido
        weight_kg?: number;        // ← corregido
        height_cm?: number;        // ← corregido
        oxygen_saturation?: number;
    };
    prescriptions?: CreatePrescriptionDTO[];
    lab_orders?: CreateLabOrderDTO[];
}

export interface UpdateConsultationDTO {
    reason?: string;
    symptoms?: string;
    diagnosis_code?: string;
    diagnosis_desc?: string;
    treatment_plan?: string;
    notes?: string;
    follow_up_date?: string;
    status?: string;
    reason_for_visit?: string;
    chief_complaint?: string;
    assessment?: string;
    plan?: string;
    vital_signs?: {
        blood_pressure?: string;
        heart_rate?: number;
        temperature_c?: number;    // ← corregido
        weight_kg?: number;        // ← corregido
        height_cm?: number;        // ← corregido
        oxygen_saturation?: number;
    };
}

export interface CreatePrescriptionDTO {
    medication_name: string;
    medication_code?: string;
    dosage: string;
    frequency: string;
    duration?: string;
    route?: string;
    instructions?: string;
}

export interface CreateLabOrderDTO {
    exam_name: string;
    exam_code?: string;
    exam_type?: string;
    priority?: string;
    instructions?: string;
}

export interface UpdateLabOrderDTO {
    result?: string;
    result_date?: string;
    status?: string;
}
