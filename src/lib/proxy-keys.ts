import 'server-only';
import crypto from 'crypto';

export function generateSecureApiKey(): string {
  const prefix = 'px_';
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('hex');
  return prefix + key;
}

export function validateApiKeyFormat(apiKey: string): boolean {
  const regex = /^px_[a-f0-9]{64}$/;
  return regex.test(apiKey);
}
