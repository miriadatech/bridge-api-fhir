// src/utils/ministryClient.ts
import axios, { AxiosInstance } from 'axios';

interface TenantMinistryConfig {
    ministry_client_id: string;
    ministry_client_secret: string;
    ministry_auth_url: string;
    ministry_scope?: string;
    ministry_api_url?: string;
}

// Cache simple de tokens por tenant (en memoria)
// En producción usar Redis
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(config: TenantMinistryConfig): Promise<string> {
    const cacheKey = config.ministry_client_id;
    const cached = tokenCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
        return cached.token;
    }

    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.ministry_client_id,
        client_secret: config.ministry_client_secret,
        scope: config.ministry_scope ?? 'rda',
    });

    const response = await axios.post(config.ministry_auth_url, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10_000,
    });

    const { access_token, expires_in } = response.data;

    // Guardar con 30s de margen de seguridad
    tokenCache.set(cacheKey, {
        token: access_token,
        expiresAt: Date.now() + (expires_in - 30) * 1000,
    });

    return access_token;
}

export async function ministryClient(
    config: TenantMinistryConfig,
): Promise<AxiosInstance> {
    const token = await getAccessToken(config);
    const baseURL = config.ministry_api_url
        ?? 'https://api.minsalud.gov.co';

    return axios.create({
        baseURL,
        timeout: 30_000,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json',
        },
    });
}
