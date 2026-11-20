// src/rda/rda.registry.ts
// Registro central de los 4 tipos de RDA (Resolución 1888 de 2025):
// cómo se valida, cómo se traduce y a qué operación del Ministerio se envía.

import Joi from 'joi';
import { RDAPatientStatementTranslator } from '../translators/RDAPatientStatementTranslator';
import { RDAAmbulatoryTranslator } from '../translators/RDAAmbulatoryTranslator';
import { RDAEncounterTranslator } from '../translators/rda/RDAEncounterTranslator';
import { PROFILES, findDanglingReferences } from '../translators/rda/common';
import {
    pacienteSchema, consultaSchema, urgenciasSchema, hospitalizacionSchema, validate,
} from './rda.schemas';

export type RdaTipo = 'paciente' | 'consulta' | 'urgencias' | 'hospitalizacion';

export interface RdaTypeDefinition {
    tipo: RdaTipo;
    nombre: string;
    /** Operación FHIR del mecanismo IHCE (relativa a la URL base del cliente) */
    operation: string;
    compositionProfile: string;
    schema: Joi.ObjectSchema;
    translate: (input: any) => Record<string, unknown>;
    /** Normaliza arrays opcionales antes de traducir */
    defaults: (input: any) => void;
}

const arr = (o: any, ...keys: string[]) => keys.forEach(k => { o[k] = Array.isArray(o[k]) ? o[k] : []; });

export const RDA_TYPES: Record<RdaTipo, RdaTypeDefinition> = {
    paciente: {
        tipo: 'paciente',
        nombre: 'RDA Paciente (antecedentes manifestados por el paciente)',
        operation: '/Composition/$enviar-rda-paciente',
        compositionProfile: PROFILES.COMPOSITION_PATIENT,
        schema: pacienteSchema,
        defaults: (i) => arr(i, 'conditions', 'allergies', 'familyHistory', 'medications'),
        translate: (i) => RDAPatientStatementTranslator.translate(i) as Record<string, unknown>,
    },
    consulta: {
        tipo: 'consulta',
        nombre: 'RDA Consulta Externa',
        operation: '/Composition/$enviar-rda-consulta',
        compositionProfile: PROFILES.COMPOSITION_AMBULATORY,
        schema: consultaSchema,
        defaults: (i) => arr(i, 'conditions', 'allergies', 'risk_factors', 'medication_requests', 'service_requests', 'document_references'),
        translate: (i) => RDAAmbulatoryTranslator.translate(i) as Record<string, unknown>,
    },
    urgencias: {
        tipo: 'urgencias',
        nombre: 'RDA Urgencias / Atención inmediata',
        operation: '/Composition/$enviar-rda-urgencias',
        compositionProfile: PROFILES.COMPOSITION_EMERGENCY,
        schema: urgenciasSchema,
        defaults: () => undefined,
        translate: (i) => RDAEncounterTranslator.translate('urgencias', i),
    },
    hospitalizacion: {
        tipo: 'hospitalizacion',
        nombre: 'RDA Hospitalización / Internación',
        operation: '/Composition/$enviar-rda-hospitalizacion',
        compositionProfile: PROFILES.COMPOSITION_HOSPITALIZATION,
        schema: hospitalizacionSchema,
        defaults: () => undefined,
        translate: (i) => RDAEncounterTranslator.translate('hospitalizacion', i),
    },
};

/** Alias aceptados en la URL y en interoperabilidad_recibida.tipo_evento */
const ALIASES: Record<string, RdaTipo> = {
    paciente: 'paciente', 'rda-paciente': 'paciente', patient: 'paciente', antecedentes: 'paciente',
    consulta: 'consulta', 'consulta-externa': 'consulta', consulta_externa: 'consulta', ambulatorio: 'consulta',
    ambulatory: 'consulta', ambulatoria: 'consulta', 'rda-consulta': 'consulta',
    urgencias: 'urgencias', urgencia: 'urgencias', emergency: 'urgencias', 'rda-urgencias': 'urgencias',
    hospitalizacion: 'hospitalizacion', hospitalización: 'hospitalizacion', internacion: 'hospitalizacion',
    inpatient: 'hospitalizacion', 'rda-hospitalizacion': 'hospitalizacion',
};

export function resolveTipo(value: string | null | undefined): RdaTipo | null {
    if (!value) return null;
    return ALIASES[value.toString().trim().toLowerCase()] ?? null;
}

/** Determina el tipo de RDA a partir del perfil de la Composition del bundle (entry[0]). */
export function tipoFromBundle(bundle: any): RdaTipo | null {
    const profiles: string[] = bundle?.entry?.[0]?.resource?.meta?.profile ?? [];
    for (const def of Object.values(RDA_TYPES)) {
        if (profiles.includes(def.compositionProfile)) return def.tipo;
    }
    return null;
}

export interface TranslationResult {
    ok: boolean;
    errors: string[];
    warnings: string[];
    bundle?: Record<string, unknown>;
}

export function validateAndTranslate(tipo: RdaTipo, input: any): TranslationResult {
    const def = RDA_TYPES[tipo];
    const errors = validate(def.schema, input);
    if (errors.length > 0) return { ok: false, errors, warnings: [] };

    def.defaults(input);
    const bundle = def.translate(input);

    const dangling = findDanglingReferences(bundle as any);
    if (dangling.length > 0) {
        return {
            ok: false,
            errors: dangling.map(r => `La referencia ${r} no corresponde a ningún recurso del bundle (revise los id cruzados: reason_condition_id, procedure_id, request_id …)`),
            warnings: [],
            bundle,
        };
    }
    return { ok: true, errors: [], warnings: [], bundle };
}
