// src/services/TerminologyService.ts
// Autocorrección de displays antes de enviar al Ministerio.
//
// El mecanismo IHCE rechaza un RDA si el display no coincide EXACTAMENTE con el
// configurado ("Code '02' ... has incorrect display 'Urbana', should be 'Rural'").
// Este servicio descarga los CodeSystem del Ministerio (GET /CodeSystem/{id}),
// los cachea (24 h por defecto, como recomienda el Manual de Operaciones: usar
// estos endpoints para mantener tablas actualizadas, no para validar cada envío)
// y reemplaza los displays del Bundle por los oficiales.
//
// Se activa con TERMINOLOGY_AUTOFIX=true.
import axios from 'axios';
import { ClienteCredenciales } from '../types/worker.types';
import { FhirSenderService } from './FhirSenderService';
import { logger } from '../utils/logger';

const MINSALUD_CS_PREFIX = 'https://fhir.minsalud.gov.co/rda/CodeSystem/';

interface CacheEntry { expiresAt: number; displays: Map<string, string> | null }

export class TerminologyService {
    private readonly cache = new Map<string, CacheEntry>();
    private readonly ttlMs: number;
    /** Mapa opcional system → id de CodeSystem en el Ministerio (ej. CIE-10) */
    private readonly extraSystems: Record<string, string>;

    constructor(private readonly sender: FhirSenderService) {
        this.ttlMs = parseFloat(process.env.TERMINOLOGY_CACHE_HOURS ?? '24') * 3_600_000;
        this.extraSystems = {};
        if (process.env.TERMINOLOGY_ICD10_ID) {
            this.extraSystems['http://hl7.org/fhir/sid/icd-10'] = process.env.TERMINOLOGY_ICD10_ID;
        }
    }

    static enabled(): boolean {
        return (process.env.TERMINOLOGY_AUTOFIX ?? 'false').toLowerCase() === 'true';
    }

    private csId(system: string): string | null {
        if (this.extraSystems[system]) return this.extraSystems[system];
        if (system.startsWith(MINSALUD_CS_PREFIX)) return system.slice(MINSALUD_CS_PREFIX.length);
        return null;
    }

    private async load(cliente: ClienteCredenciales, csId: string): Promise<Map<string, string> | null> {
        const base = FhirSenderService.baseUrl(cliente);
        const key = `${base}|${csId}`;
        const hit = this.cache.get(key);
        if (hit && hit.expiresAt > Date.now()) return hit.displays;

        let displays: Map<string, string> | null = null;
        try {
            const res = await axios.get(`${base}/CodeSystem/${encodeURIComponent(csId)}`, {
                headers: await this.sender.headers(cliente),
                timeout: 30_000,
            });
            displays = new Map();
            const walk = (concepts: any[] | undefined) => {
                for (const c of concepts ?? []) {
                    if (c?.code && c?.display) displays!.set(String(c.code), String(c.display));
                    if (Array.isArray(c?.concept)) walk(c.concept);
                }
            };
            walk(res.data?.concept);
            logger.info(`[Terminology] CodeSystem ${csId}: ${displays.size} códigos en caché`);
        } catch (err: any) {
            logger.warn(`[Terminology] No se pudo descargar CodeSystem ${csId}: ${err?.response?.status ?? ''} ${err?.message}`);
            displays = null; // se cachea el fallo también, para no reintentar en cada registro
        }
        this.cache.set(key, { expiresAt: Date.now() + (displays ? this.ttlMs : 15 * 60_000), displays });
        return displays;
    }

    /**
     * Recorre el bundle y corrige displays de codings con systems conocidos.
     * Devuelve la lista de correcciones aplicadas (para log/auditoría).
     */
    async fixDisplays(cliente: ClienteCredenciales, bundle: Record<string, unknown>): Promise<string[]> {
        const codings: Array<{ system: string; code: string; display?: string }> = [];
        const walk = (node: unknown): void => {
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (node && typeof node === 'object') {
                const o = node as Record<string, any>;
                if (typeof o.system === 'string' && typeof o.code === 'string' && 'display' in o) codings.push(o as any);
                Object.values(o).forEach(walk);
            }
        };
        walk(bundle);

        const fixes: string[] = [];
        for (const c of codings) {
            const id = this.csId(c.system);
            if (!id) continue;
            const map = await this.load(cliente, id);
            const official = map?.get(c.code);
            if (official && official !== c.display) {
                fixes.push(`${id}|${c.code}: "${c.display}" → "${official}"`);
                c.display = official;
            }
        }
        return fixes;
    }
}
