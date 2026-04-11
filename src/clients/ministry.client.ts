import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import pool from '../config/database';

// =============================================
// TOKEN CACHE
// =============================================
interface TokenCache {
    access_token: string;
    expires_at: number; // timestamp ms
}

let tokenCache: TokenCache | null = null;

async function getMinistryToken(): Promise<string> {
    const mode = process.env.MINISTRY_MODE || 'sandbox';

    // En sandbox/disabled no necesitamos token real
    if (mode !== 'strict') {
        return 'sandbox-token-mock';
    }

    const now = Date.now();
    const MARGIN_MS = 60_000; // renovar 60s antes de expirar

    // Retornar token cacheado si aún es válido
    if (tokenCache && tokenCache.expires_at - MARGIN_MS > now) {
        return tokenCache.access_token;
    }

    // Solicitar nuevo token al Ministerio
    const response = await axios.post(
        process.env.MINISTRY_AUTH_URL!,
        new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.MINISTRY_CLIENT_ID!,
            client_secret: process.env.MINISTRY_CLIENT_SECRET!,
            scope: process.env.MINISTRY_SCOPE || 'fhir'
        }),
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
    );

    const { access_token, expires_in } = response.data;

    tokenCache = {
        access_token,
        expires_at: now + (expires_in * 1000)
    };

    console.log(`[Ministry Auth] Token renovado. Expira en ${expires_in}s`);
    return access_token;
}

// =============================================
// AXIOS INSTANCE — Singleton
// =============================================
const ministryAxios: AxiosInstance = axios.create({
    baseURL: process.env.MINISTRY_API_URL || 'https://api.ministeriosalud.gov.co',
    timeout: 15_000,
    headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
    }
});

// ─── REQUEST INTERCEPTOR — Inyectar token ───
ministryAxios.interceptors.request.use(async (config) => {
    const token = await getMinistryToken();
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
});

// ─── RESPONSE INTERCEPTOR — Retry en 401 ───
ministryAxios.interceptors.response.use(
    response => response,
    async (error) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            console.warn('[Ministry Auth] Token expirado — renovando...');

            originalRequest._retry = true;
            tokenCache = null; // Limpiar cache para forzar renovación

            const newToken = await getMinistryToken();
            originalRequest.headers = {
                ...originalRequest.headers,
                Authorization: `Bearer ${newToken}`
            };

            return ministryAxios(originalRequest);
        }

        return Promise.reject(error);
    }
);

export const ministryClient = ministryAxios;
