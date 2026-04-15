// src/modules/ehr/patient.service.ts
import { pool } from '../../db';
import { v4 as uuidv4 } from 'uuid';

export class PatientService {

    async create(tenantId: string, data: {
        family_name: string;
        given_name: string;
        identifier_type: 'CC' | 'CE' | 'PA' | 'PE';
        identifier_value: string;
        gender?: 'male' | 'female' | 'other';
        birth_date?: string;
        contact_phone?: string;
        contact_email?: string;
    }) {

        const patientId = uuidv4();

        const result = await pool.query(
            `INSERT INTO patients (
         id, tenant_id, family_name, given_name,
         identifier_type, identifier_value,
         gender, birth_date, contact_phone, contact_email,
         fhir_data, is_synced
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                patientId,
                tenantId,
                data.family_name,
                data.given_name,
                data.identifier_type,
                data.identifier_value,
                data.gender || 'other',
                data.birth_date || null,
                data.contact_phone || null,
                data.contact_email || null,
                JSON.stringify({
                    resourceType: 'Patient',
                    identifier: [{
                        type: 'document',
                        value: data.identifier_value,
                        system: `urn:oid:1.3.6.1.4.1.60.36.15.${this.getIdentifierSystem(data.identifier_type)}`
                    }],
                    name: [{
                        family: data.family_name,
                        given: [data.given_name]
                    }],
                    gender: data.gender || 'other',
                    birthDate: data.birth_date || null,
                    telecom: [
                        ...(data.contact_phone ? [{ system: 'phone', value: data.contact_phone }] : []),
                        ...(data.contact_email ? [{ system: 'email', value: data.contact_email }] : [])
                    ]
                }),
                false
            ]
        );

        return result.rows[0];
    }

    async list(tenantId: string, filters?: { gender?: string; identifier_type?: string }) {
        let query = `SELECT * FROM patients WHERE tenant_id = $1 AND deleted_at IS NULL`;
        const params: any[] = [tenantId];

        if (filters?.gender) {
            query += ` AND gender = $${params.length + 1}`;
            params.push(filters.gender);
        }

        if (filters?.identifier_type) {
            query += ` AND identifier_type = $${params.length + 1}`;
            params.push(filters.identifier_type);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, params);
        return result.rows;
    }

    async getById(tenantId: string, patientId: string) {
        const result = await pool.query(
            `SELECT * FROM patients WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
            [patientId, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error('PATIENT_NOT_FOUND');
        }

        return result.rows[0];
    }

    async update(tenantId: string, patientId: string, data: any) {
        const result = await pool.query(
            `UPDATE patients
         SET family_name = COALESCE($1, family_name),
             given_name = COALESCE($2, given_name),
             gender = COALESCE($3, gender),
             birth_date = COALESCE($4, birth_date),
             contact_phone = COALESCE($5, contact_phone),
             contact_email = COALESCE($6, contact_email),
             updated_at = NOW()
         WHERE id = $7 AND tenant_id = $8 AND deleted_at IS NULL
         RETURNING *`,
            [
                data.family_name,
                data.given_name,
                data.gender,
                data.birth_date,
                data.contact_phone,
                data.contact_email,
                patientId,
                tenantId
            ]
        );

        if (result.rows.length === 0) {
            throw new Error('PATIENT_NOT_FOUND');
        }

        return result.rows[0];
    }

    async delete(tenantId: string, patientId: string) {
        // Soft delete
        const result = await pool.query(
            `UPDATE patients
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING id`,
            [patientId, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error('PATIENT_NOT_FOUND');
        }

        return { success: true, message: 'Paciente eliminado' };
    }

    private getIdentifierSystem(type: string): string {
        const map: Record<string, string> = {
            'CC': '1.3.6.1.4.1.60.36.15.1',  // Cédula de Ciudadanía
            'CE': '1.3.6.1.4.1.60.36.15.2',  // Cédula de Extranjería
            'PA': '1.3.6.1.4.1.60.36.15.3',  // Pasaporte
            'PE': '1.3.6.1.4.1.60.36.15.4'   // Permiso Especial
        };
        return map[type] || '1.3.6.1.4.1.60.36.15.1';
    }
}
