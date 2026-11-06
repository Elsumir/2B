import fs from 'fs';
import path from 'path';

export function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return process.env;
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = { ...process.env };
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...parts] = trimmed.split('=');
    if (key && parts.length) {
      env[key.trim()] = parts.join('=').trim();
    }
  });
  return env;
}
