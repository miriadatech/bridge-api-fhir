import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface PatientInput {
    // Identidad
    given_name: string;
    family_name: string;
    father_family_name?: string;
    mother_family_name?: string;
    middle_name?: string;
    gender: string;
    birth_date: string;
    birth_time?: string;

    // Identificación
    identifier_type?: string;    // CC, TI, PA, RC, CE, etc.
    identifier_value: string;

    // Contacto
    contact_email?: string;
    contact_phone?: string;

    // Dirección
    address_line?: string;
    address_city?: string;
    address_state?: string;
    address_postal_code?: string;
    address_country?: string;
    divipola_code?: string;
    residence_zone_code?: string;

    // Datos clínicos
    blood_type?: string;
    rh_type?: string;
    marital_status?: string;

    // RDA / MinSalud
    nationality_code?: string;
    ethnicity_code?: string;
    disability_code?: string;
    gender_identity_code?: string;
    biological_gender_code?: string;

    // Emergencia
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;

    // Otros
    preferred_language?: string;
    deceased?: boolean;
}

export class PatientService {

    async createPatient(tenantId: string, data: PatientInput): Promise<any> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO patients (
        id, tenant_id,
        given_name, family_name, father_family_name, mother_family_name, middle_name,
        gender, birth_date, birth_time,
        identifier_type, identifier_value,
        contact_email, contact_phone,
        address_line, address_city, address_state, address_postal_code, address_country,
        divipola_code, residence_zone_code,
        blood_type, rh_type, marital_status,
        nationality_code, ethnicity_code, disability_code,
        gender_identity_code, biological_gender_code,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        preferred_language, deceased,
        is_active, created_at, updated_at
      ) VALUES (
        $1,  $2,
        $3,  $4,  $5,  $6,  $7,
        $8,  $9,  $10,
        $11, $12,
        $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        $28, $29,
        $30, $31, $32,
        $33, $34,
        true, $35, $35
      )
      RETURNING *`,
            [
                id, tenantId,
                data.given_name, data.family_name,
                data.father_family_name ?? null,
                data.mother_family_name ?? null,
                data.middle_name ?? null,
                data.gender, data.birth_date,
                data.birth_time ?? null,
                data.identifier_type ?? 'CC',
                data.identifier_value,
                data.contact_email ?? null,
                data.contact_phone ?? null,
                data.address_line ?? null,
                data.address_city ?? null,
                data.address_state ?? null,
                data.address_postal_code ?? null,
                data.address_country ?? 'Colombia',
                data.divipola_code ?? null,
                data.residence_zone_code ?? null,
                data.blood_type ?? null,
                data.rh_type ?? null,
                data.marital_status ?? null,
                data.nationality_code ?? 'CO',
                data.ethnicity_code ?? null,
                data.disability_code ?? null,
                data.gender_identity_code ?? null,
                data.biological_gender_code ?? null,
                data.emergency_contact_name ?? null,
                data.emergency_contact_phone ?? null,
                data.emergency_contact_relationship ?? null,
                data.preferred_language ?? 'es',
                data.deceased ?? false,
                now,
            ]
        );

        return result.rows[0];
    }

    async getPatientById(tenantId: string, patientId: string): Promise<any> {
        const result = await pool.query(
            `SELECT * FROM patients
       WHERE id = $1 AND tenant_id = $2 AND is_active = true AND deleted_at IS NULL`,
            [patientId, tenantId]
        );
        return result.rows[0] ?? null;
    }

    async getPatients(tenantId: string, limit = 50, offset = 0): Promise<any[]> {
        const result = await pool.query(
            `SELECT 
        id, given_name, family_name, father_family_name, mother_family_name,
        gender, birth_date, identifier_type, identifier_value,
        contact_email, contact_phone, address_city, address_state,
        blood_type, rh_type, is_active, created_at
       FROM patients
       WHERE tenant_id = $1 AND is_active = true AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
            [tenantId, limit, offset]
        );
        return result.rows;
    }

    async updatePatient(tenantId: string, patientId: string, data: Partial<PatientInput>): Promise<any> {
        // Construir SET dinámico solo con campos presentes
        const allowed = [
            'given_name', 'family_name', 'father_family_name', 'mother_family_name',
            'middle_name', 'gender', 'birth_date', 'birth_time',
            'identifier_type', 'identifier_value',
            'contact_email', 'contact_phone',
            'address_line', 'address_city', 'address_state', 'address_postal_code', 'address_country',
            'divipola_code', 'residence_zone_code',
            'blood_type', 'rh_type', 'marital_status',
            'nationality_code', 'ethnicity_code', 'disability_code',
            'gender_identity_code', 'biological_gender_code',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'preferred_language', 'deceased',
        ];

        const sets: string[] = [];
        const values: any[] = [];
        let idx = 1;

        for (const key of allowed) {
            if (key in data) {
                sets.push(`${key} = $${idx}`);
                values.push((data as any)[key]);
                idx++;
            }
        }

        if (sets.length === 0) throw new Error('No fields to update');

        sets.push(`updated_at = $${idx}`);
        values.push(new Date());
        idx++;

        values.push(patientId);
        values.push(tenantId);

        const result = await pool.query(
            `UPDATE patients
       SET ${sets.join(', ')}
       WHERE id = $${idx} AND tenant_id = $${idx + 1} AND is_active = true AND deleted_at IS NULL
       RETURNING *`,
            values
        );

        return result.rows[0] ?? null;
    }

    async deletePatient(tenantId: string, patientId: string): Promise<boolean> {
        const result = await pool.query(
            `UPDATE patients
       SET is_active = false, deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
            [patientId, tenantId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    async searchPatients(tenantId: string, query: string): Promise<any[]> {
        const like = `%${query}%`;
        const result = await pool.query(
            `SELECT 
        id, given_name, family_name, identifier_type, identifier_value,
        gender, birth_date, contact_phone, contact_email
       FROM patients
       WHERE tenant_id = $1
         AND is_active = true
         AND deleted_at IS NULL
         AND (
           given_name ILIKE $2
           OR family_name ILIKE $2
           OR father_family_name ILIKE $2
           OR identifier_value ILIKE $2
           OR contact_email ILIKE $2
         )
       ORDER BY family_name, given_name
       LIMIT 20`,
            [tenantId, like]
        );
        return result.rows;
    }
}

export default new PatientService();
