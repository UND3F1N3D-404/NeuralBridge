import { createServer } from 'node:http';
import { loadConfig, discoverProviders } from './config.js';
import { Gateway } from './gateway.js';

const config = loadConfig();
const providers = discoverProviders(config);
const endpoints = Object.fromEntries(Object.entries(config).filter(([k]) => k.endsWith('_BASE_URL')).map(([k,v]) => [k.slice(0,-9).toLowerCase(),v]));
const gateway = new Gateway(providers, { mode: config.GATEWAY_MODE === 'live' ? 'live' : 'simulation', endpoints });
const port = Number(config.PORT || 3000);
const host = config.HOST || '127.0.0.1';
const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && path === '/health') return json(res, 200, { status: 'ok', mode: gateway.mode, providerCount: providers.length });
  if (req.method === 'GET' && path === '/v1/providers') return json(res, 200, { object: 'list', data: gateway.list() });
  if (req.method !== 'POST' || path !== '/v1/chat/completions') return json(res, 404, { error: { message: 'Route not found' } });
  let raw = '';
  try {
    for await (const chunk of req) { raw += chunk; if (raw.length > 131072) return json(res, 413, { error: { message: 'Payload too large' } }); }
    const body = JSON.parse(raw);
    const result = await gateway.complete(body);
    return json(res, 200, result);
  } catch (error) { return json(res, error.status || (error instanceof SyntaxError ? 400 : 500), { error: { message: error.status || error instanceof SyntaxError ? error.message : 'Internal server error' } }); }
});
server.listen(port, host, () => console.log(`NeuralBridge listening at http://${host}:${port} (${gateway.mode}; ${providers.length} providers)`));
