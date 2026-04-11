// src/controllers/encounter.controller.ts

import { Request, Response } from 'express';
import { EncounterService } from '../services/encounter.service';
import { FHIRValidator } from '../utils/fhir.validator';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class EncounterController {
    private encounterService: EncounterService;

    constructor() {
        this.encounterService = new EncounterService();
    }

    // ✅ ARROW FUNCTION - preserva 'this'
    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const { user } = req as any;
            console.log(req.body);
            const encounterData = req.body;

            FHIRValidator.validateEncounter(encounterData);

            if (encounterData.subject?.reference) {
                const patientExists = await this.encounterService.verifyPatientExists(
                    encounterData.subject.reference
                );
                if (!patientExists) {
                    res.status(404).json({
                        success: false,
                        error: 'Paciente no encontrado',
                    });
                    return;
                }
            }

            const encounter = await this.encounterService.create(
                encounterData,
                user?.id
            );

            logger.info(`Encounter creado: ${encounter.id}`);

            res.status(201).json({
                success: true,
                data: encounter,
                message: 'Encounter creado exitosamente',
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error creando encounter', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { user } = req as any;

            const encounter = await this.encounterService.findById(id);

            if (!encounter) {
                res.status(404).json({
                    success: false,
                    error: 'Encounter no encontrado',
                });
                return;
            }

            logger.info(`Encounter consultado: ${id}`, {
                userId: user?.id,
                encounterId: id,
            });

            res.status(200).json({
                success: true,
                data: encounter,
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error obteniendo encounter', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { user } = req as any;
            const updateData = req.body;

            const existing = await this.encounterService.findById(id);
            if (!existing) {
                res.status(404).json({
                    success: false,
                    error: 'Encounter no encontrado',
                });
                return;
            }

            FHIRValidator.validateEncounter(updateData);

            const updated = await this.encounterService.update(
                id,
                updateData,
                user?.id
            );

            logger.info(`Encounter actualizado: ${id}`);

            res.status(200).json({
                success: true,
                data: updated,
                message: 'Encounter actualizado exitosamente',
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error actualizando encounter', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { user } = req as any;

            const existing = await this.encounterService.findById(id);
            if (!existing) {
                res.status(404).json({
                    success: false,
                    error: 'Encounter no encontrado',
                });
                return;
            }

            await this.encounterService.delete(id, user?.id);

            logger.info(`Encounter eliminado: ${id}`);

            res.status(200).json({
                success: true,
                message: 'Encounter eliminado exitosamente',
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error eliminando encounter', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION - list NO lanza 404 si está vacío
    list = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('✅ list() ejecutándose...');

            const {
                patient,
                practitioner,
                status,
                type,
                date_from,
                date_to,
                skip = '0',
                limit = '50',
            } = req.query;

            const filters = {
                patient: patient as string,
                practitioner: practitioner as string,
                status: status as string,
                type: type as string,
                date_from: date_from as string,
                date_to: date_to as string,
            };

            console.log('📄 Filters:', filters);

            const encounters = await this.encounterService.list(
                filters,
                parseInt(skip as string),
                parseInt(limit as string)
            );

            console.log('📦 Resultado:', encounters);

            // ✅ Siempre 200, aunque esté vacío
            res.status(200).json({
                success: true,
                data: encounters.data ?? [],
                total: encounters.total ?? 0,
                skip: parseInt(skip as string),
                limit: parseInt(limit as string),
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error listando encounters', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    search = async (req: Request, res: Response): Promise<void> => {
        try {
            const query = req.query as Record<string, string>;

            const searchParams = {
                patient: query.patient,
                status: query.status,
                type: query.type,
                participant: query.participant,
                location: query.location,
                date: query.date,
                'date-from': query['date-from'],
                'date-to': query['date-to'],
            };

            const results = await this.encounterService.search(searchParams);

            res.status(200).json({
                success: true,
                data: results,
                total: results.length,
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error buscando encounters', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    getByPatient = async (req: Request, res: Response): Promise<void> => {
        try {
            const { patientId } = req.params;
            const { user } = req as any;
            const { skip = '0', limit = '50' } = req.query;

            const encounters = await this.encounterService.findByPatient(
                patientId,
                parseInt(skip as string),
                parseInt(limit as string)
            );

            logger.info(`Encounters del paciente: ${patientId}`, {
                userId: user?.id,
                patientId,
            });

            res.status(200).json({
                success: true,
                data: encounters.data,
                total: encounters.total,
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error obteniendo encounters por paciente', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    getByPractitioner = async (req: Request, res: Response): Promise<void> => {
        try {
            const { practitionerId } = req.params;
            const { skip = '0', limit = '50' } = req.query;

            const encounters = await this.encounterService.findByPractitioner(
                practitionerId,
                parseInt(skip as string),
                parseInt(limit as string)
            );

            res.status(200).json({
                success: true,
                data: encounters.data,
                total: encounters.total,
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error obteniendo encounters por profesional', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    getByDateRange = async (req: Request, res: Response): Promise<void> => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                res.status(400).json({
                    success: false,
                    error: 'startDate y endDate son requeridos',
                });
                return;
            }

            const encounters = await this.encounterService.findByDateRange(
                new Date(startDate as string),
                new Date(endDate as string)
            );

            res.status(200).json({
                success: true,
                data: encounters,
                total: encounters.length,
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error obteniendo encounters por fechas', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    validate = async (req: Request, res: Response): Promise<void> => {
        try {
            const encounterData = req.body;
            const isValid = FHIRValidator.validateEncounter(encounterData);

            res.status(200).json({
                success: true,
                valid: isValid,
                message: 'Encounter válido según estándar FHIR',
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    valid: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error validando encounter', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    bulkCreate = async (req: Request, res: Response): Promise<void> => {
        try {
            const { user } = req as any;
            const { encounters } = req.body;

            if (!Array.isArray(encounters) || encounters.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'El body debe contener un array de encounters',
                });
                return;
            }

            encounters.forEach((enc) => FHIRValidator.validateEncounter(enc));

            const created = await this.encounterService.bulkCreate(
                encounters,
                user?.id
            );

            logger.info(`${created.length} encounters creados en bulk`);

            res.status(201).json({
                success: true,
                data: created,
                message: `${created.length} encounters creados exitosamente`,
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error en bulk create', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    export = async (req: Request, res: Response): Promise<void> => {
        try {
            const { format = 'json', patientId, dateFrom, dateTo } = req.query;
            const { user } = req as any;

            const filters: Record<string, any> = {};
            if (patientId) filters.patientId = patientId;
            if (dateFrom && dateTo) {
                filters.dateFrom = new Date(dateFrom as string);
                filters.dateTo = new Date(dateTo as string);
            }

            const result = await this.encounterService.export(
                filters,
                format as string
            );

            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="encounters.csv"');
            } else {
                res.setHeader('Content-Type', 'application/json');
            }

            logger.info(`Encounters exportados: formato ${format}`);
            res.send(result);

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error exportando encounters', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }

    // ✅ ARROW FUNCTION
    getStatistics = async (req: Request, res: Response): Promise<void> => {
        try {
            const { patientId, practitionerId, dateFrom, dateTo } = req.query;

            const filters = {
                patientId: patientId as string,
                practitionerId: practitionerId as string,
                dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
                dateTo: dateTo ? new Date(dateTo as string) : undefined,
            };

            const stats = await this.encounterService.getStatistics(filters);

            res.status(200).json({
                success: true,
                data: stats,
            });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            logger.error('Error obteniendo estadísticas', error as Error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            });
        }
    }
}
