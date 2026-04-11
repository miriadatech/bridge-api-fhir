import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class EncounterService {
    /**
     * Crear un nuevo encounter
     */
    async create(encounterData: any, userId: string) {
        const id = uuidv4();
        const now = new Date();

        const encounter = {
            id,
            resourceType: 'Encounter',
            ...encounterData,
            meta: {
                versionId: '1',
                lastUpdated: now.toISOString(),
            },
            created_by: userId,
            created_at: now,
            updated_at: now,
        };

        try {
            const query = `
        INSERT INTO encounters (
          id, resource_type, data, patient_id, status, 
          encounter_type, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *;
      `;

            const patientId = encounterData.subject?.reference?.split('/')[1] || null;

            const result = await pool.query(query, [
                id,
                'Encounter',
                JSON.stringify(encounter),
                patientId,
                encounterData.status || 'in-progress',
                encounterData.type?.[0]?.coding?.[0]?.code || 'UNKNOWN',
                userId,
                now,
                now,
            ]);

            return encounter;
        } catch (error) {
            logger.error('Error creando encounter en BD', error);
            throw error;
        }
    }

    /**
     * Obtener encounter por ID
     */
    async findById(id: string) {
        try {
            const query = 'SELECT data FROM encounters WHERE id = $1 AND deleted_at IS NULL';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0].data;
        } catch (error) {
            logger.error('Error obteniendo encounter', error);
            throw error;
        }
    }

    /**
     * Actualizar encounter
     */
    async update(id: string, updateData: any, userId: string) {
        try {
            const existing = await this.findById(id);
            if (!existing) {
                throw new Error('Encounter no encontrado');
            }

            const updated = {
                ...existing,
                ...updateData,
                meta: {
                    ...existing.meta,
                    versionId: (parseInt(existing.meta.versionId) + 1).toString(),
                    lastUpdated: new Date().toISOString(),
                },
                updated_by: userId,
            };

            const query = `
        UPDATE encounters 
        SET data = $1, updated_at = $2, updated_by = $3
        WHERE id = $4
        RETURNING data;
      `;

            await pool.query(query, [
                JSON.stringify(updated),
                new Date(),
                userId,
                id,
            ]);

            return updated;
        } catch (error) {
            logger.error('Error actualizando encounter', error);
            throw error;
        }
    }

    /**
     * Soft delete de encounter
     */
    async delete(id: string, userId: string) {
        try {
            const query = `
        UPDATE encounters 
        SET deleted_at = $1, deleted_by = $2
        WHERE id = $3;
      `;

            await pool.query(query, [new Date(), userId, id]);
        } catch (error) {
            logger.error('Error eliminando encounter', error);
            throw error;
        }
    }

    /**
     * Listar encounters con filtros
     */
    async list(
        filters: Record<string, string>,
        skip: number,
        limit: number
    ) {
        try {
            let query = 'SELECT data FROM encounters WHERE deleted_at IS NULL';
            const params: any[] = [];
            let paramCount = 1;

            if (filters.patient) {
                query += ` AND patient_id = $${paramCount}`;
                params.push(filters.patient);
                paramCount++;
            }

            if (filters.status) {
                query += ` AND status = $${paramCount}`;
                params.push(filters.status);
                paramCount++;
            }

            if (filters.date_from && filters.date_to) {
                query += ` AND created_at >= $${paramCount} AND created_at <= $${paramCount + 1}`;
                params.push(new Date(filters.date_from), new Date(filters.date_to));
                paramCount += 2;
            }

            // Contar total
            const countResult = await pool.query(
                query.replace('SELECT data', 'SELECT COUNT(*) as count'),
                params
            );
            const total = parseInt(countResult.rows[0].count);

            // Obtener datos paginados
            query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            params.push(limit, skip);

            const result = await pool.query(query, params);

            return {
                data: result.rows.map((row: any) => row.data),
                total,
            };
        } catch (error) {
            logger.error('Error listando encounters', error);
            throw error;
        }
    }

    /**
     * Búsqueda avanzada
     */
    async search(searchParams: Record<string, string>) {
        try {
            let query = 'SELECT data FROM encounters WHERE deleted_at IS NULL';
            const params: any[] = [];
            let paramCount = 1;

            // Implementar búsqueda FHIR estándar
            if (searchParams.patient) {
                query += ` AND patient_id ILIKE $${paramCount}`;
                params.push(`%${searchParams.patient}%`);
                paramCount++;
            }

            if (searchParams.status) {
                query += ` AND data->>'status' = $${paramCount}`;
                params.push(searchParams.status);
                paramCount++;
            }

            const result = await pool.query(query, params);
            return result.rows.map((row: any) => row.data);
        } catch (error) {
            logger.error('Error buscando encounters', error);
            throw error;
        }
    }

    /**
     * Obtener encuentros por paciente
     */
    async findByPatient(
        patientId: string,
        skip: number,
        limit: number
    ) {
        try {
            const query = `
        SELECT data FROM encounters 
        WHERE patient_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3;
      `;

            const countQuery = `
        SELECT COUNT(*) as count FROM encounters 
        WHERE patient_id = $1 AND deleted_at IS NULL;
      `;

            const result = await pool.query(query, [patientId, limit, skip]);
            const countResult = await pool.query(countQuery, [patientId]);

            return {
                data: result.rows.map((row: any) => row.data),
                total: parseInt(countResult.rows[0].count),
            };
        } catch (error) {
            logger.error('Error obteniendo encounters por paciente', error);
            throw error;
        }
    }

    /**
     * Obtener encuentros por profesional
     */
    async findByPractitioner(
        practitionerId: string,
        skip: number,
        limit: number
    ) {
        try {
            const query = `
        SELECT data FROM encounters 
        WHERE data->'participant' @> 
          jsonb_build_array(jsonb_build_object('individual', jsonb_build_object('reference', $1)))
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3;
      `;

            const result = await pool.query(query, [
                `Practitioner/${practitionerId}`,
                limit,
                skip,
            ]);

            return {
                data: result.rows.map((row: any) => row.data),
                total: result.rows.length,
            };
        } catch (error) {
            logger.error('Error obteniendo encounters por profesional', error);
            throw error;
        }
    }

    /**
     * Obtener encuentros por rango de fechas
     */
    async findByDateRange(startDate: Date, endDate: Date) {
        try {
            const query = `
        SELECT data FROM encounters 
        WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL
        ORDER BY created_at DESC;
      `;

            const result = await pool.query(query, [startDate, endDate]);
            return result.rows.map((row: any) => row.data);
        } catch (error) {
            logger.error('Error obteniendo encounters por rango de fechas', error);
            throw error;
        }
    }

    /**
     * Verificar si un paciente existe
     */
    async verifyPatientExists(patientReference: string): Promise<boolean> {
        try {
            const patientId = patientReference.split('/')[1];
            const query = 'SELECT id FROM patients WHERE id = $1 AND deleted_at IS NULL';
            const result = await pool.query(query, [patientId]);

            return result.rows.length > 0;
        } catch (error) {
            logger.error('Error verificando paciente', error);
            return false;
        }
    }

    /**
     * Crear múltiples encounters
     */
    async bulkCreate(encounters: any[], userId: string) {
        try {
            const created: any[] = [];

            for (const encounter of encounters) {
                const result = await this.create(encounter, userId);
                created.push(result);
            }

            return created;
        } catch (error) {
            logger.error('Error en bulk create', error);
            throw error;
        }
    }

    /**
     * Exportar encounters
     */
    async export(filters: Record<string, any>, format: string) {
        try {
            let query = 'SELECT data FROM encounters WHERE deleted_at IS NULL';
            const params: any[] = [];
            let paramCount = 1;

            if (filters.patientId) {
                query += ` AND patient_id = $${paramCount}`;
                params.push(filters.patientId);
                paramCount++;
            }

            const result = await pool.query(query, params);
            const encounters = result.rows.map((row: any) => row.data);

            if (format === 'csv') {
                return this.convertToCSV(encounters);
            }

            return JSON.stringify(encounters, null, 2);
        } catch (error) {
            logger.error('Error exportando encounters', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas
     */
    async getStatistics(filters: Record<string, any>) {
        try {
            let query = `
        SELECT 
          COUNT(*) as total_encounters,
          status,
          COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished,
          COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress
        FROM encounters
        WHERE deleted_at IS NULL
      `;
            const params: any[] = [];
            let paramCount = 1;

            if (filters.patientId) {
                query += ` AND patient_id = $${paramCount}`;
                params.push(filters.patientId);
                paramCount++;
            }

            query += ` GROUP BY status`;

            const result = await pool.query(query, params);

            return {
                total: result.rows.reduce((sum: number, row: any) => sum + parseInt(row.total_encounters), 0),
                byStatus: result.rows,
            };
        } catch (error) {
            logger.error('Error obteniendo estadísticas', error);
            throw error;
        }
    }

    /**
     * Convertir a CSV
     */
    private convertToCSV(encounters: any[]): string {
        const headers = [
            'ID',
            'Patient',
            'Status',
            'Type',
            'Start',
            'End',
            'Created At',
        ];

        const rows = encounters.map((enc) => [
            enc.id,
            enc.subject?.reference || '',
            enc.status || '',
            enc.type?.[0]?.coding?.[0]?.display || '',
            enc.period?.start || '',
            enc.period?.end || '',
            enc.meta?.lastUpdated || '',
        ]);

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${cell}"`).join(','))
            .join('\n');

        return csv;
    }
}
