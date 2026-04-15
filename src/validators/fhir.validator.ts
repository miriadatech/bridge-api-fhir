// src/validators/fhir.validator.ts

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface FHIRBundle {
    resourceType: string;
    type: string;
    entry?: FHIREntry[];
    [key: string]: unknown;
}

export interface FHIREntry {
    resource?: FHIRResource;
    request?: FHIRRequest;
    [key: string]: unknown;
}

export interface FHIRResource {
    resourceType: string;
    id?: string;
    [key: string]: unknown;
}

export interface FHIRRequest {
    method: string;
    url: string;
}

// ─── Perfiles MinSalud RDA ────────────────────────────────────────────────────

const REQUIRED_RESOURCE_TYPES = [
    'Patient',
    'Encounter',
    'Practitioner',
    'Organization',
] as const;

const ALLOWED_BUNDLE_TYPES = [
    'transaction',
    'batch',
    'document',
    'collection',
] as const;

const MINSALUD_REQUIRED_EXTENSIONS = {
    Patient: [
        'http://hl7.org/fhir/StructureDefinition/patient-nationality',
    ],
    Encounter: [
        'http://minsalud.gov.co/fhir/StructureDefinition/encounter-modalidad',
    ],
} as const;

// ─── Clase principal ──────────────────────────────────────────────────────────

export class FHIRValidator {

    // ── Validar Bundle completo ───────────────────────────────────────────────

    validateBundle(bundle: unknown): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Verificar que sea un objeto
        if (!bundle || typeof bundle !== 'object') {
            return {
                valid: false,
                errors: ['Bundle must be a non-null object'],
                warnings: [],
            };
        }

        const b = bundle as Record<string, unknown>;

        // 2. resourceType debe ser "Bundle"
        if (b['resourceType'] !== 'Bundle') {
            errors.push(
                `resourceType must be "Bundle", got "${b['resourceType']}"`
            );
        }

        // 3. type debe ser un valor válido
        if (!ALLOWED_BUNDLE_TYPES.includes(b['type'] as never)) {
            errors.push(
                `Bundle.type "${b['type']}" is not valid. ` +
                `Allowed: ${ALLOWED_BUNDLE_TYPES.join(', ')}`
            );
        }

        // 4. entry debe ser un array
        if (!Array.isArray(b['entry'])) {
            errors.push('Bundle.entry must be an array');
            return { valid: false, errors, warnings };
        }

        const entries = b['entry'] as FHIREntry[];

        // 5. Validar cada entry
        entries.forEach((entry, index) => {
            const entryErrors = this.validateEntry(entry, index);
            errors.push(...entryErrors);
        });

        // 6. Verificar recursos requeridos por MinSalud RDA
        const presentTypes = entries
            .map(e => e.resource?.resourceType)
            .filter(Boolean);

        REQUIRED_RESOURCE_TYPES.forEach(requiredType => {
            if (!presentTypes.includes(requiredType)) {
                warnings.push(
                    `MinSalud RDA recomienda incluir recurso "${requiredType}" en el Bundle`
                );
            }
        });

        // 7. Validar perfiles MinSalud en cada recurso
        entries.forEach((entry, index) => {
            if (!entry.resource) return;
            const profileWarnings = this.validateMinSaludProfile(
                entry.resource,
                index
            );
            warnings.push(...profileWarnings);
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    // ── Validar una Entry ─────────────────────────────────────────────────────

    private validateEntry(entry: FHIREntry, index: number): string[] {
        const errors: string[] = [];
        const prefix = `Bundle.entry[${index}]`;

        if (!entry.resource) {
            errors.push(`${prefix}: missing "resource"`);
            return errors;
        }

        if (!entry.resource.resourceType) {
            errors.push(`${prefix}.resource: missing "resourceType"`);
        }

        // Para Bundles tipo transaction, se requiere request
        if (!entry.request) {
            errors.push(`${prefix}: missing "request" (required for transaction bundles)`);
        } else {
            if (!entry.request.method) {
                errors.push(`${prefix}.request: missing "method"`);
            }
            if (!entry.request.url) {
                errors.push(`${prefix}.request: missing "url"`);
            }
        }

        // Validar recurso específico según su tipo
        const resourceErrors = this.validateResource(entry.resource, prefix);
        errors.push(...resourceErrors);

        return errors;
    }

    // ── Validar recurso según su tipo ─────────────────────────────────────────

    private validateResource(resource: FHIRResource, prefix: string): string[] {
        const errors: string[] = [];

        switch (resource.resourceType) {
            case 'Patient':
                errors.push(...this.validatePatient(resource, prefix));
                break;
            case 'Encounter':
                errors.push(...this.validateEncounter(resource, prefix));
                break;
            case 'MedicationRequest':
                errors.push(...this.validateMedicationRequest(resource, prefix));
                break;
            case 'ServiceRequest':
                errors.push(...this.validateServiceRequest(resource, prefix));
                break;
            case 'Condition':
                errors.push(...this.validateCondition(resource, prefix));
                break;
        }

        return errors;
    }

    // ── Validaciones por tipo de recurso ──────────────────────────────────────

    private validatePatient(resource: FHIRResource, prefix: string): string[] {
        const errors: string[] = [];
        const r = resource as Record<string, unknown>;

        if (!r['id']) {
            errors.push(`${prefix} (Patient): missing "id"`);
        }

        if (!Array.isArray(r['identifier']) || (r['identifier'] as unknown[]).length === 0) {
            errors.push(`${prefix} (Patient): missing "identifier" array`);
        }

        if (!Array.isArray(r['name']) || (r['name'] as unknown[]).length === 0) {
            errors.push(`${prefix} (Patient): missing "name" array`);
        }

        return errors;
    }

    private validateEncounter(resource: FHIRResource, prefix: string): string[] {
        const errors: string[] = [];
        const r = resource as Record<string, unknown>;

        if (!r['id']) {
            errors.push(`${prefix} (Encounter): missing "id"`);
        }

        if (!r['status']) {
            errors.push(`${prefix} (Encounter): missing "status"`);
        }

        if (!r['class']) {
            errors.push(`${prefix} (Encounter): missing "class"`);
        }

        if (!r['subject']) {
            errors.push(`${prefix} (Encounter): missing "subject" (Patient reference)`);
        }

        return errors;
    }

    private validateMedicationRequest(resource: FHIRResource, prefix: string): string[] {
        const errors: string[] = [];
        const r = resource as Record<string, unknown>;

        if (!r['id']) {
            errors.push(`${prefix} (MedicationRequest): missing "id"`);
        }

        if (!r['status']) {
            errors.push(`${prefix} (MedicationRequest): missing "status"`);
        }

        if (!r['intent']) {
            errors.push(`${prefix} (MedicationRequest): missing "intent"`);
        }

        if (!r['subject']) {
            errors.push(`${prefix} (MedicationRequest): missing "subject"`);
        }

        if (!r['medicationCodeableConcept'] && !r['medicationReference']) {
            errors.push(
                `${prefix} (MedicationRequest): must have either ` +
                `"medicationCodeableConcept" or "medicationReference"`
            );
        }

        return errors;
    }

    private validateServiceRequest(resource: FHIRResource, prefix: string): string[] {
        const errors: string[] = [];
        const r = resource as Record<string, unknown>;

        if (!r['id']) {
            errors.push(`${prefix} (ServiceRequest): missing "id"`);
        }

        if (!r['status']) {
            errors.push(`${prefix} (ServiceRequest): missing "status"`);
        }

        if (!r['intent']) {
            errors.push(`${prefix} (ServiceRequest): missing "intent"`);
        }

        if (!r['subject']) {
            errors.push(`${prefix} (ServiceRequest): missing "subject"`);
        }

        if (!r['code']) {
            errors.push(`${prefix} (ServiceRequest): missing "code"`);
        }

        return errors;
    }

    private validateCondition(resource: FHIRResource, prefix: string): string[] {
        const errors: string[] = [];
        const r = resource as Record<string, unknown>;

        if (!r['id']) {
            errors.push(`${prefix} (Condition): missing "id"`);
        }

        if (!r['subject']) {
            errors.push(`${prefix} (Condition): missing "subject"`);
        }

        if (!r['code']) {
            errors.push(`${prefix} (Condition): missing "code"`);
        }

        return errors;
    }

    // ── Validar perfiles MinSalud RDA ─────────────────────────────────────────

    private validateMinSaludProfile(
        resource: FHIRResource,
        index: number
    ): string[] {
        const warnings: string[] = [];
        const prefix = `Bundle.entry[${index}].resource (${resource.resourceType})`;
        const r = resource as Record<string, unknown>;

        const requiredExtensions =
            MINSALUD_REQUIRED_EXTENSIONS[
            resource.resourceType as keyof typeof MINSALUD_REQUIRED_EXTENSIONS
            ];

        if (!requiredExtensions) return warnings;

        const extensions = Array.isArray(r['extension'])
            ? (r['extension'] as Array<Record<string, unknown>>)
            : [];

        const presentUrls = extensions.map(e => e['url']);

        requiredExtensions.forEach(reqUrl => {
            if (!presentUrls.includes(reqUrl)) {
                warnings.push(
                    `${prefix}: MinSalud RDA recomienda extensión "${reqUrl}"`
                );
            }
        });

        return warnings;
    }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const fhirValidator = new FHIRValidator();
