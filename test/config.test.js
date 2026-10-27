import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv, discoverProviders, publicProvider } from '../src/config.js';
import { Gateway } from '../src/gateway.js';

test('parseEnv reads quoted and unquoted values', () => {
  assert.deepEqual(parseEnv('# comment\nOPENAI_API_KEY="abc"\nPORT=3000\n'), { OPENAI_API_KEY: 'abc', PORT: '3000' });
});
test('provider discovery hides credentials in public responses', () => {
  const providers = discoverProviders({ OPENAI_API_KEY: 'secret', OTHER: 'x' });
  assert.equal(providers.length, 1);
  assert.equal(publicProvider(providers[0]).credential, undefined);
});
test('simulation never calls network transport', async () => {
  const providers = discoverProviders({ OPENAI_API_KEY: 'placeholder' });
  const gateway = new Gateway(providers, { transport: () => { throw new Error('network accessed'); } });
  const result = await gateway.complete({ provider: 'openai', messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(result.mode, 'simulation');
});
test('invalid message payload is rejected', async () => {
  const gateway = new Gateway(discoverProviders({ OPENAI_API_KEY: 'placeholder' }));
  await assert.rejects(gateway.complete({ provider: 'openai', messages: [] }), { status: 400 });
});
