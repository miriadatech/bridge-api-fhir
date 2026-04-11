import axios from 'axios';

interface TokenCache {
    accessToken: string;
    expiresAt: number;  // timestamp en ms
}

export class MinistryAuth {
    private cache: TokenCache | null = null;
    private readonly REFRESH_MARGIN = 60 * 1000; // 60 segundos antes de expirar

    // ─── OBTENER TOKEN (usa caché si sigue vigente) ──────────────────
    async getToken(): Promise<string> {
        if (this.cache && Date.now() < this.cache.expiresAt - this.REFRESH_MARGIN) {
            return this.cache.accessToken;
        }
        return this.fetchNewToken();
    }

    // ─── FORZAR RENOVACIÓN (llamado en retry 401) ────────────────────
    async forceRefresh(): Promise<void> {
        this.cache = null;
        await this.fetchNewToken();
    }

    // ─── SOLICITAR NUEVO TOKEN AL MINISTERIO ─────────────────────────
    private async fetchNewToken(): Promise<string> {
        const response = await axios.post(
            process.env.MINISTRY_TOKEN_URL || 'https://auth.sispro.gov.co/oauth/token',
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.MINISTRY_CLIENT_ID || '',
                client_secret: process.env.MINISTRY_CLIENT_SECRET || ''
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        const { access_token, expires_in } = response.data;

        this.cache = {
            accessToken: access_token,
            expiresAt: Date.now() + (expires_in * 1000)
        };

        return access_token;
    }
}
