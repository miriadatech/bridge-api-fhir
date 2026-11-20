// src/services/FhirSenderService.ts
// Envía un Bundle RDA al Ministerio usando la operación correspondiente a su tipo:
//   /Composition/$enviar-rda-paciente | $enviar-rda-consulta | $enviar-rda-urgencias | $enviar-rda-hospitalizacion
import axios, { isAxiosError } from 'axios';
import { ClienteCredenciales, ResultadoEnvio } from '../types/worker.types';
import { MinisterioAuthService } from './MinisterioAuthService';
import { logger } from '../utils/logger';

/** Códigos HTTP que indican error en el contenido del RDA (reintentar no sirve sin corregirlo) */
const NO_REINTENTABLES = new Set([400, 404, 409, 412, 413, 422]);

export class FhirSenderService {
  constructor(
    private readonly authService: MinisterioAuthService,
    private readonly httpTimeoutMs: number = 30_000,
  ) { }

  /** URL base IHCE del cliente, sin slash final (ej. https://sandbox.ihcecol.gov.co/ihce) */
  static baseUrl(cliente: ClienteCredenciales): string {
    return (cliente.ministry_api_murl ?? cliente.ministry_api_url ?? '').replace(/\/$/, '');
  }

  async headers(cliente: ClienteCredenciales): Promise<Record<string, string>> {
    const token = await this.authService.getToken(cliente);
    const h: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    };
    if (cliente.ministry_api_msubs_key) h['Ocp-Apim-Subscription-Key'] = cliente.ministry_api_msubs_key;
    return h;
  }

  /**
   * @param operation ruta de la operación, ej. "/Composition/$enviar-rda-urgencias"
   */
  async enviar(
    registroId: number,
    cliente: ClienteCredenciales,
    payloadFhir: Record<string, unknown>,
    operation: string,
  ): Promise<ResultadoEnvio> {
    const inicio = Date.now();
    const base = FhirSenderService.baseUrl(cliente);
    if (!base) {
      return {
        registroId, exitoso: false, reintentable: false, duracionMs: 0,
        error: `Cliente ${cliente.nit} no tiene ministry_api_murl configurado (PUT /api/auth/ministry-credentials).`,
      };
    }
    // Concatenación directa: axios ignora el path del baseURL con rutas que empiezan por '/'
    const fullUrl = `${base}${operation}`;

    const intentar = async () => {
      const response = await axios.post(fullUrl, payloadFhir, {
        headers: await this.headers(cliente),
        timeout: this.httpTimeoutMs,
      });
      return response;
    };

    try {
      logger.info(`[FhirSender] #${registroId} → ${fullUrl} | cliente ${cliente.nit}`);
      let response;
      try {
        response = await intentar();
      } catch (err) {
        // 401 → token vencido/revocado: renovar y reintentar UNA vez
        if (isAxiosError(err) && err.response?.status === 401) {
          logger.warn(`[FhirSender] 401 para cliente ${cliente.nit}. Renovando token y reintentando…`);
          this.authService.invalidateToken(cliente.id);
          response = await intentar();
        } else {
          throw err;
        }
      }

      const duracionMs = Date.now() - inicio;
      const ministerioId = FhirSenderService.extraerId(response.data, response.headers?.['location']);
      logger.info(`[FhirSender] ✅ #${registroId} aceptado | ministerioId: ${ministerioId} | ${duracionMs}ms`);
      return {
        registroId, exitoso: true, ministerioId: ministerioId ?? undefined,
        respuesta: response.data as Record<string, unknown>, httpStatus: response.status, duracionMs,
      };
    } catch (err: unknown) {
      const duracionMs = Date.now() - inicio;
      const httpStatus = isAxiosError(err) ? err.response?.status : undefined;
      const mensajeError = FhirSenderService.extraerMensajeError(err);
      const reintentable = httpStatus === undefined || !NO_REINTENTABLES.has(httpStatus);
      logger.error(`[FhirSender] ❌ #${registroId} | cliente ${cliente.nit} | HTTP ${httpStatus ?? '-'} | ${mensajeError}`);
      return {
        registroId, exitoso: false, error: mensajeError, httpStatus, reintentable, duracionMs,
        respuesta: isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? err.response.data as Record<string, unknown>
          : undefined,
      };
    }
  }

  /** Busca el identificador del RDA en la respuesta (Bundle, recurso o header Location). */
  static extraerId(data: any, location?: string): string | null {
    if (data?.id) return String(data.id);
    const comp = data?.entry?.find((e: any) => e?.resource?.resourceType === 'Composition')?.resource;
    if (comp?.id) return String(comp.id);
    if (data?.identifier?.value) return String(data.identifier.value);
    if (location) return String(location).split('/').filter(Boolean).pop() ?? null;
    return null;
  }

  /** Mensaje legible con TODOS los issues del OperationOutcome (antes solo el primero). */
  static extraerMensajeError(err: unknown): string {
    if (!isAxiosError(err)) return err instanceof Error ? err.message : String(err);

    const data: any = err.response?.data;
    const status = err.response?.status;

    if (data?.resourceType === 'OperationOutcome' && Array.isArray(data.issue)) {
      const issues = data.issue.map((i: any) => {
        const txt = i?.diagnostics || i?.details?.text || i?.details?.coding?.[0]?.display || i?.code || 'sin diagnóstico';
        const loc = Array.isArray(i?.location) && i.location.length ? ` @ ${i.location.join(', ')}` : (Array.isArray(i?.expression) && i.expression.length ? ` @ ${i.expression.join(', ')}` : '');
        return `[${i?.severity ?? 'error'}] ${txt}${loc}`;
      });
      return `HTTP ${status} OperationOutcome: ${issues.join(' | ')}`.slice(0, 4000);
    }
    if (status) {
      return `HTTP ${status} ${err.response?.statusText ?? ''} – ${typeof data === 'string' ? data : JSON.stringify(data ?? {})}`.slice(0, 4000);
    }
    if (err.request) return `Sin respuesta del servidor: ${err.message}`;
    return err.message;
  }
}
