// src/services/MinisterioAuthService.ts
// Servicio de autenticación OAuth por cliente con caché en memoria
import axios from 'axios';
import { ClienteCredenciales, OAuthConfig, TokenCacheEntry } from '../types/worker.types';
import { logger } from '../utils/logger';

export class MinisterioAuthService {
  // Cache de tokens indexado por clienteId (UUID)
  private readonly tokenCache = new Map<string, TokenCacheEntry>();

  // Margen de renovación anticipada (60 s antes de expirar)
  private readonly REFRESH_MARGIN_MS = 60_000;

  /**
   * Obtiene un Bearer token válido para el cliente dado.
   * Usa el cache si el token aún no expiró.
   * Lanza error si el cliente no tiene credenciales OAuth configuradas.
   */
  async getToken(cliente: ClienteCredenciales): Promise<string> {
    if (cliente.ministry_mode === 'disabled') {
      throw new Error(
        `Cliente ${cliente.nit} tiene ministry_mode=disabled. No se puede autenticar.`,
      );
    }


    const config = this.buildOAuthConfig(cliente);
    console.log(config)
    const cached = this.tokenCache.get(cliente.id);
    console.log(cached)

    if (cached && Date.now() < cached.expiresAt - this.REFRESH_MARGIN_MS) {
      return cached.accessToken;
    }

    return this.fetchNewToken(cliente.id, config);
  }

  /**
   * Invalida el token cacheado del cliente (llamar en retry 401).
   */
  invalidateToken(clienteId: string): void {
    this.tokenCache.delete(clienteId);
    logger.debug(`[MinisterioAuth] Token invalidado para cliente ${clienteId}`);
  }

  /**
   * Invalida todos los tokens cacheados (útil al reiniciar el worker).
   */
  invalidateAll(): void {
    this.tokenCache.clear();
    logger.debug('[MinisterioAuth] Cache de tokens limpiado');
  }

  // ─── Privados ────────────────────────────────────────────────────────────────

  private buildOAuthConfig(cliente: ClienteCredenciales): OAuthConfig {
    if (
      !cliente.ministry_client_id ||
      !cliente.ministry_client_secret ||
      !cliente.ministry_tenant_id
    ) {
      throw new Error(
        `Cliente ${cliente.nit} no tiene credenciales OAuth completas ` +
        `(ministry_client_id, ministry_client_secret, ministry_tenant_id).`,
      );
    }

    return {
      clientId: cliente.ministry_client_id,
      clientSecret: cliente.ministry_client_secret,
      tenantId: cliente.ministry_tenant_id,
      scope: cliente.ministry_scope ?? 'openid',
    };
  }

  private async fetchNewToken(
    clienteId: string,
    config: OAuthConfig,
  ): Promise<string> {
    // Construir URL de token de Microsoft Azure AD
    const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

    logger.debug(
      `[MinisterioAuth] Solicitando token para cliente ${clienteId} | URL: ${tokenUrl}`,
    );

    const params = new URLSearchParams({
      grant_type: 'Client_Credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: config.scope,
    });

    const response = await axios.post<{
      access_token: string;
      expires_in: number;
    }>(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15_000,
    });

    const { access_token, expires_in } = response.data;

    console.log('Token obtenido: ', access_token)

    if (!access_token) {
      throw new Error(
        `[MinisterioAuth] Respuesta OAuth inválida para cliente ${clienteId}: falta access_token`,
      );
    }

    this.tokenCache.set(clienteId, {
      accessToken: access_token,
      expiresAt: Date.now() + expires_in * 1_000,
    });

    logger.debug(
      `[MinisterioAuth] Token obtenido para ${clienteId}, expira en ${expires_in}s`,
    );

    return access_token;
  }
}
