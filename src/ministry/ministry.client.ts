import axios, { AxiosInstance } from 'axios';
import { MinistryAuth } from './ministry.auth';

export class MinistryClient {
    private http: AxiosInstance;
    private auth: MinistryAuth;

    constructor() {
        this.auth = new MinistryAuth();

        this.http = axios.create({
            baseURL: process.env.MINISTRY_BASE_URL || 'https://fhir.sispro.gov.co/r4',
            timeout: 10000,
            headers: {
                'Content-Type': 'application/fhir+json',
                'Accept': 'application/fhir+json'
            }
        });

        // ─── INTERCEPTOR: Inyectar token automáticamente ───────────────
        this.http.interceptors.request.use(async (config) => {
            const token = await this.auth.getToken();
            config.headers['Authorization'] = `Bearer ${token}`;
            return config;
        });

        // ─── INTERCEPTOR: Reintentar si token expiró (401) ────────────
        this.http.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    await this.auth.forceRefresh();
                    const newToken = await this.auth.getToken();
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return this.http(originalRequest);
                }

                // Parsear OperationOutcome de FHIR
                const fhirError = error.response?.data;
                if (fhirError?.resourceType === 'OperationOutcome') {
                    const issue = fhirError.issue?.[0];
                    const message = issue?.diagnostics || issue?.details?.text || 'Error del Ministerio';
                    const severity = issue?.severity || 'error';
                    throw new Error(`[Ministry FHIR ${severity}] ${message}`);
                }

                throw error;
            }
        );
    }

    // ─── CREAR PACIENTE ─────────────────────────────────────────────
    async createPatient(fhirResource: object): Promise<any> {
        const response = await this.http.post('/Patient', fhirResource);
        return response.data;
    }

    // ─── OBTENER PACIENTE POR ID fhir ───────────────────────────────
    async getById(fhirId: string): Promise<any> {
        const response = await this.http.get(`/Patient/${fhirId}`);
        return response.data;
    }

    // ─── ACTUALIZAR PACIENTE ─────────────────────────────────────────
    async updatePatient(fhirId: string, fhirResource: object): Promise<any> {
        const response = await this.http.put(`/Patient/${fhirId}`, fhirResource);
        return response.data;
    }

    // ─── BUSCAR PACIENTE ─────────────────────────────────────────────
    async search(params: Record<string, string>): Promise<any> {
        const response = await this.http.get('/Patient', { params });
        return response.data;
    }

    // ─── HEALTH CHECK ────────────────────────────────────────────────
    async healthCheck(): Promise<boolean> {
        try {
            await this.http.get('/metadata');
            return true;
        } catch {
            return false;
        }
    }
}
