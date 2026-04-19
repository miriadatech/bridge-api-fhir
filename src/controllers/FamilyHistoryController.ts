// src/controllers/FamilyHistoryController.ts

import { Response } from 'express';
import { TenantRequest } from '../middleware/auth.middleware';
import { FamilyHistoryService } from '../services/FamilyHistoryService';

const service = new FamilyHistoryService();

export class FamilyHistoryController {

    // GET /api/ehr/patients/:patientId/family-history
    list = async (req: TenantRequest, res: Response): Promise<void> => {
        try {
            const { patientId } = req.params;
            const tenantId = req.tenant.id;

            const records = await service.list(patientId, tenantId);

            res.status(200).json({
                success: true,
                count: records.length,
                data: records,
            });

        } catch (error: any) {
            console.error('[FamilyHistoryController.list]', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    // GET /api/ehr/patients/:patientId/family-history/:id
    getById = async (req: TenantRequest, res: Response): Promise<void> => {
        try {
            const { patientId, id } = req.params;
            const tenantId = req.tenant.id;

            const record = await service.getById(id, patientId, tenantId);
            res.status(200).json({ success: true, data: record });

        } catch (error: any) {
            const status = error.message.includes('no encontrado') ? 404 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    };

    // POST /api/ehr/patients/:patientId/family-history
    create = async (req: TenantRequest, res: Response): Promise<void> => {
        try {
            const { patientId } = req.params;
            const tenantId = req.tenant.id;

            // Validación básica de campos requeridos
            const { relationship_code, relationship_display } = req.body;

            if (!relationship_code || !relationship_display) {
                res.status(400).json({
                    success: false,
                    error: 'relationship_code y relationship_display son requeridos',
                    example: {
                        relationship_code: '72705000',
                        relationship_display: 'Madre',
                        condition_code: 'E11',
                        condition_display: 'Diabetes mellitus tipo 2',
                        deceased_boolean: false,
                        onset_age: 45,
                        note: 'Diagnosticada a los 45 años',
                    },
                });
                return;
            }

            const record = await service.create({
                ...req.body,
                patient_id: patientId,
                tenant_id: tenantId,
            });

            res.status(201).json({ success: true, data: record });

        } catch (error: any) {
            const status = error.message.includes('inválido') ? 400 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    };

    // PUT /api/ehr/patients/:patientId/family-history/:id
    update = async (req: TenantRequest, res: Response): Promise<void> => {
        try {
            const { patientId, id } = req.params;
            const tenantId = req.tenant.id;

            const record = await service.update(id, patientId, tenantId, req.body);
            res.status(200).json({ success: true, data: record });

        } catch (error: any) {
            const status = error.message.includes('no encontrado') ? 404
                : error.message.includes('inválido') ? 400
                    : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    };

    // DELETE /api/ehr/patients/:patientId/family-history/:id
    delete = async (req: TenantRequest, res: Response): Promise<void> => {
        try {
            const { patientId, id } = req.params;
            const tenantId = req.tenant.id;

            await service.delete(id, patientId, tenantId);
            res.status(200).json({
                success: true,
                message: 'Antecedente familiar eliminado correctamente',
            });

        } catch (error: any) {
            const status = error.message.includes('no encontrado') ? 404 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    };

    // POST /api/ehr/patients/:patientId/family-history/bulk
    bulkCreate = async (req: TenantRequest, res: Response): Promise<void> => {
        try {
            const { patientId } = req.params;
            const tenantId = req.tenant.id;
            const { records } = req.body;

            if (!Array.isArray(records) || records.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'El campo "records" debe ser un array no vacío',
                });
                return;
            }

            if (records.length > 50) {
                res.status(400).json({
                    success: false,
                    error: 'Máximo 50 registros por operación bulk',
                });
                return;
            }

            const created = await service.bulkCreate(patientId, tenantId, records);
            res.status(201).json({
                success: true,
                count: created.length,
                data: created,
            });

        } catch (error: any) {
            const status = error.message.includes('inválido') ? 400 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    };
}
