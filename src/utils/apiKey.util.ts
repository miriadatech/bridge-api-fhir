import crypto from 'crypto';

export function generateApiKey(): string {
    // Formato: bridge_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `bridge_live_${randomPart}`;
}

export function hashApiKey(apiKey: string): string {
    // Nunca guardar la API key en texto plano en logs
    return crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex')
        .substring(0, 8);
}
