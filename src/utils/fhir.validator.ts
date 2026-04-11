// src/utils/fhir.validator.ts

import { AppError } from './errors';
import { logger } from './logger';

export class FHIRValidator {

    // Validar recurso FHIR genérico
    static validate(resource: any): boolean {
        if (!resource) {
            throw new AppError('El recurso FHIR no puede estar vacío', 400);
        }

        if (!resource.resourceType) {
            throw new AppError('El recurso FHIR debe tener resourceType', 400);
        }

        // Validar según el tipo de recurso
        switch (resource.resourceType) {
            case 'Encounter':
                return FHIRValidator.validateEncounter(resource);
            case 'Patient':
                return FHIRValidator.validatePatient(resource);
            default:
                logger.warn(`Tipo de recurso no validado específicamente: ${resource.resourceType}`);
                return true;
        }
    }

    // Validar Encounter FHIR
    static validateEncounter(encounter: any): boolean {
        const errors: string[] = [];

        // Campos requeridos
        if (!encounter.status) {
            errors.push('El campo status es requerido');
        }

        if (!encounter.class) {
            errors.push('El campo class es requerido');
        }

        // Valores válidos de status
        const validStatuses = [
            'planned',
            'arrived',
            'in-progress',
            'finished',
            'cancelled',
        ];

        if (encounter.status && !validStatuses.includes(encounter.status)) {
            errors.push(`Status inválido: ${encounter.status}. Valores válidos: ${validStatuses.join(', ')}`);
        }

        // Validar period si existe
        if (encounter.period) {
            if (!encounter.period.start) {
                errors.push('El campo period.start es requerido');
            }
            if (encounter.period.end && encounter.period.end < encounter.period.start) {
                errors.push('period.end no puede ser anterior a period.start');
            }
        }

        if (errors.length > 0) {
            logger.warn(`Validación fallida para Encounter: ${errors.join(' | ')}`);
            throw new AppError(`Errores de validación FHIR: ${errors.join(', ')}`, 422);
        }

        logger.info('Encounter validado correctamente');
        return true;
    }

    // Validar Patient FHIR
    static validatePatient(patient: any): boolean {
        const errors: string[] = [];

        if (!patient.name || patient.name.length === 0) {
            errors.push('El paciente debe tener al menos un nombre');
        }

        if (!patient.gender) {
            errors.push('El campo gender es requerido');
        }

        const validGenders = ['male', 'female', 'other', 'unknown'];
        if (patient.gender && !validGenders.includes(patient.gender)) {
            errors.push(`Gender inválido: ${patient.gender}`);
        }

        if (errors.length > 0) {
            throw new AppError(`Errores de validación Patient: ${errors.join(', ')}`, 422);
        }

        return true;
    }

    // Validar referencia FHIR (ej: "Patient/123")
    static validateReference(reference: string): boolean {
        const pattern = /^[A-Za-z]+\/[A-Za-z0-9\-\.]+$/;

        if (!pattern.test(reference)) {
            throw new AppError(
                `Referencia FHIR inválida: ${reference}. Formato esperado: ResourceType/id`,
                400
            );
        }

        return true;
    }

    // Validar formato de fecha FHIR
    static validateDate(date: string): boolean {
        const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

        if (!isoPattern.test(date)) {
            throw new AppError(
                `Fecha FHIR inválida: ${date}. Formato esperado: YYYY-MM-DD o ISO 8601`,
                400
            );
        }

        return true;
    }
}
