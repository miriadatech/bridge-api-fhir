// src/types/consultation.types.ts

// ─── Modelos de DB ────────────────────────────────────────────────────────────

export interface LocalConsultation {
    id: string;
    patient_id: string;
    encounter_id: string;
    consultation_date: string;
    reason_for_visit: string;
    chief_complaint?: string;
    assessment?: string;
    plan?: string;
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
    tenant_id: string;
}

export interface LocalPrescription {
    id: string;
    consultation_id: string;
    medication_code?: string;
    medication_display: string;
    dosage: string;
    frequency: string;
    route?: string;
    duration_days?: number;
    instructions?: string;
    status: 'active' | 'inactive' | 'completed';
    created_at: string;
    updated_at: string;
    tenant_id: string;
}

export interface LocalLabOrder {
    id: string;
    consultation_id: string;
    code: string;
    display: string;
    ordered_date: string;
    specimen_type?: string;
    status: 'ordered' | 'pending' | 'completed' | 'cancelled';
    result?: string;
    result_date?: string;
    created_at: string;
    updated_at: string;
    tenant_id: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateConsultationDTO {
    patient_id: string;
    reason_for_visit: string;
    chief_complaint?: string;
    assessment?: string;
    plan?: string;
    status?: 'pending' | 'completed' | 'cancelled';
}

export interface UpdateConsultationDTO {
    assessment?: string;
    plan?: string;
    status?: 'pending' | 'completed' | 'cancelled';
}

export interface CreatePrescriptionDTO {
    consultation_id: string;
    medication_code?: string;
    medication_display: string;
    dosage: string;
    frequency: string;
    route?: string;
    duration_days?: number;
    instructions?: string;
}

export interface UpdatePrescriptionDTO {
    dosage?: string;
    frequency?: string;
    route?: string;
    duration_days?: number;
    instructions?: string;
    status?: 'active' | 'inactive' | 'completed';
}

export interface CreateLabOrderDTO {
    consultation_id: string;
    code: string;
    display: string;
    specimen_type?: string;
}

export interface UpdateLabOrderDTO {
    status?: 'ordered' | 'pending' | 'completed' | 'cancelled';
    result?: string;
    result_date?: string;
}

export interface SyncPayload {
    mode: 'sandbox' | 'strict';
}
