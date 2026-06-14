// src/services/FhirSenderService.ts
// Orquesta el envío de un recurso FHIR al Ministerio con reintentos automáticos
import axios, { AxiosInstance, isAxiosError } from 'axios';
import { ClienteCredenciales, ResultadoEnvio } from '../types/worker.types';
import { MinisterioAuthService } from './MinisterioAuthService';
import { logger } from '../utils/logger';

export class FhirSenderService {
  constructor(
    private readonly authService: MinisterioAuthService,
    private readonly httpTimeoutMs: number = 30_000,
  ) { }

  /**
   * Envía un payload FHIR al Ministerio usando las credenciales del cliente.
   * Maneja automáticamente renovación de token en caso de 401.
   *
   * @param registroId  - ID del registro en BD (para logs)
   * @param cliente     - Credenciales y configuración del cliente
   * @param payloadFhir - Objeto FHIR a enviar (debe tener resourceType)
   * @returns ResultadoEnvio con éxito/error y metadata
   */
  async enviar(
    registroId: number,
    cliente: ClienteCredenciales,
    payloadFhir: Record<string, unknown>,
  ): Promise<ResultadoEnvio> {
    const inicio = Date.now();

    try {
      const { fullUrl, headers } = await this.buildRequestConfig(cliente);

      logger.info(
        `[FhirSender] Enviando registro #${registroId} → ${fullUrl} | cliente: ${cliente.nit}`,
      );

      const response = await axios.post(fullUrl, payloadFhir, {
        headers,
        timeout: this.httpTimeoutMs,
      });
      const duracionMs = Date.now() - inicio;

      const ministerioId =
        response.data?.id ??
        (response.headers?.['location'] as string | undefined)?.split('/').pop() ??
        null;

      logger.info(
        `[FhirSender] ✅ Registro #${registroId} enviado | ministerioId: ${ministerioId} | ${duracionMs}ms`,
      );

      return {
        registroId,
        exitoso: true,
        ministerioId,
        respuesta: response.data as Record<string, unknown>,
        duracionMs,
      };
    } catch (err: unknown) {
      const duracionMs = Date.now() - inicio;

      // Si es 401 → invalidar token y reintentar UNA vez
      if (isAxiosError(err) && err.response?.status === 401) {
        logger.warn(
          `[FhirSender] Token expirado para cliente ${cliente.nit}. Renovando y reintentando...`,
        );
        return this.enviarConTokenForzado(registroId, cliente, payloadFhir, inicio);
      }

      const mensajeError = this.extraerMensajeError(err);
      logger.error(
        `[FhirSender] ❌ Error en registro #${registroId} | cliente: ${cliente.nit} | ${mensajeError}`,
      );

      return {
        registroId,
        exitoso: false,
        error: mensajeError,
        duracionMs,
      };
    }
  }

  // ─── Privados ────────────────────────────────────────────────────────────────

  /**
   * Segundo intento tras renovación forzada de token (manejo de 401).
   */
  private async enviarConTokenForzado(
    registroId: number,
    cliente: ClienteCredenciales,
    payloadFhir: Record<string, unknown>,
    inicioOriginal: number,
  ): Promise<ResultadoEnvio> {
    try {
      this.authService.invalidateToken(cliente.id);
      const { fullUrl, headers } = await this.buildRequestConfig(cliente);

      const response = await axios.post(fullUrl, payloadFhir, {
        headers,
        timeout: this.httpTimeoutMs,
      });
      const duracionMs = Date.now() - inicioOriginal;

      const ministerioId = (response.data?.id as string | undefined) ?? undefined;

      logger.info(
        `[FhirSender] ✅ Registro #${registroId} enviado tras renovación de token | ${duracionMs}ms`,
      );

      return {
        registroId,
        exitoso: true,
        ministerioId,
        respuesta: response.data as Record<string, unknown>,
        duracionMs,
      };
    } catch (err: unknown) {
      const duracionMs = Date.now() - inicioOriginal;
      const mensajeError = this.extraerMensajeError(err);

      logger.error(
        `[FhirSender] ❌ Error tras renovación de token en registro #${registroId}: ${mensajeError}`,
      );

      return {
        registroId,
        exitoso: false,
        error: mensajeError,
        duracionMs,
      };
    }
  }

  /**
   * Construye la URL completa y los headers para la petición al Ministerio.
   *
   * IMPORTANTE: NO usamos axios.create({ baseURL }) porque Axios resuelve
   * las rutas con '/' inicial como absolutas desde el host, ignorando
   * cualquier path en el baseURL. En su lugar concatenamos la URL manualmente.
   *
   * URL final: {ministry_api_murl}/Composition/$enviar-rda-paciente
   */
  private async buildRequestConfig(
    cliente: ClienteCredenciales,
  ): Promise<{ fullUrl: string; headers: Record<string, string> }> {
    const token = await this.authService.getToken(cliente);

    // Tomar ministry_api_murl, quitar slash final si lo tuviera
    const base = (cliente.ministry_api_murl ?? cliente.ministry_api_url ?? '').replace(/\/$/, '');

    if (!base) {
      throw new Error(
        `[FhirSender] Cliente ${cliente.nit} no tiene ministry_api_murl configurado.`,
      );
    }

    // Concatenación directa → evita el problema de resolución de Axios
    const fullUrl = `${base}/Composition/$enviar-rda-paciente`;

    logger.info(`[FhirSender] URL destino: ${fullUrl}`);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    };

    if (cliente.ministry_api_msubs_key) {
      headers['Ocp-Apim-Subscription-Key'] = cliente.ministry_api_msubs_key;
    }

    return { fullUrl, headers };
  }

  /**
   * Endpoint del RDA de pacientes (no usado directamente, la URL se construye en buildRequestConfig).
   * Se mantiene por compatibilidad con la firma del método enviar().
   */
  private resolveEndpoint(_payload: Record<string, unknown>): string {
    return '/Composition/$enviar-rda-paciente';
  }

  /**
   * Extrae un mensaje de error legible desde cualquier tipo de error.
   * Maneja OperationOutcome de FHIR, errores Axios y errores genéricos.
   */
  private extraerMensajeError(err: unknown): string {
    if (!isAxiosError(err)) {
      return err instanceof Error ? err.message : String(err);
    }

    const data = err.response?.data;

    // OperationOutcome de FHIR
    if (data?.resourceType === 'OperationOutcome') {
      const issue = data.issue?.[0];
      const msg =
        issue?.diagnostics ||
        issue?.details?.text ||
        'Error FHIR sin diagnóstico';
      return `[OperationOutcome] ${msg}`;
    }

    // Error HTTP genérico
    const status = err.response?.status;
    const statusText = err.response?.statusText;
    if (status) {
      return `HTTP ${status} ${statusText ?? ''} – ${JSON.stringify(data ?? {})}`;
    }

    // Sin respuesta (timeout, red caída)
    if (err.request) {
      return `Sin respuesta del servidor: ${err.message}`;
    }

    return err.message;
  }
}
