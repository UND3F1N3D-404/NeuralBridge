import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Load dotenv-style KEY=VALUE records without executing their contents. */
export function parseEnv(text) {
  const result = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) throw new Error('Malformed environment assignment');
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

export function loadConfig(file = '.env', runtime = process.env) {
  const parsed = parseEnv(readFileSync(resolve(file), 'utf8'));
  return { ...parsed, ...runtime };
}

export function discoverProviders(config) {
  return Object.entries(config).filter(([key]) => key.endsWith('_API_KEY'))
    .map(([key, token]) => ({ id: key.slice(0, -8).toLowerCase(), credentialKey: key,
      configured: Boolean(token), credential: token, adapter: 'openai-compatible' }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function publicProvider(provider) {
  const { credential, ...safe } = provider;
  return safe;
}
