import { randomUUID } from 'node:crypto';

export class Gateway {
  constructor(providers, { transport = fetch, mode = 'simulation', endpoints = {} } = {}) {
    this.providers = new Map(providers.map(p => [p.id, p]));
    this.transport = transport;
    this.mode = mode;
    this.endpoints = endpoints;
  }

  list() { return [...this.providers.values()].map(({ credential, ...rest }) => rest); }

  async complete({ provider: id, model = 'neuralbridge-default', messages, temperature = 0.7 }) {
    if (!Array.isArray(messages) || messages.length === 0 || messages.some(m => !['system', 'user', 'assistant'].includes(m?.role) || typeof m.content !== 'string')) {
      throw Object.assign(new Error('messages must be a non-empty array of role/content objects'), { status: 400 });
    }
    const provider = this.providers.get(id);
    if (!provider) throw Object.assign(new Error('Unknown provider'), { status: 404 });
    if (this.mode !== 'live') return this.simulate(provider, model, messages);
    const endpoint = this.endpoints[id];
    if (!endpoint) throw Object.assign(new Error('No live endpoint configured for provider'), { status: 422 });
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') throw Object.assign(new Error('Live endpoint must use HTTPS'), { status: 422 });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.transport(url, { method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${provider.credential}` },
        body: JSON.stringify({ model, messages, temperature }) });
      if (!response.ok) throw Object.assign(new Error('Upstream request failed'), { status: 502 });
      return await response.json();
    } finally { clearTimeout(timeout); }
  }

  simulate(provider, model, messages) {
    const prompt = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
    const content = `Request accepted by ${provider.id}. Provider adapter is operating in simulation mode; no upstream inference was performed.`;
    const input = Math.ceil(prompt.length / 4), output = Math.ceil(content.length / 4);
    return { id: `chatcmpl-${randomUUID()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000),
      model, provider: provider.id, mode: 'simulation', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
      usage: { prompt_tokens: input, completion_tokens: output, total_tokens: input + output } };
  }
}
