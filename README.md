# NeuralBridge

A Node.js multi-provider API gateway with configuration-driven provider discovery, a unified chat-completion interface, and pluggable upstream endpoints.

## Architecture

- **Configuration loader** parses dotenv-style key/value records and applies process environment overrides.
- **Provider registry** discovers entries ending in `_API_KEY` without exposing credential values through public endpoints.
- **Gateway** validates chat messages, dispatches by provider ID, and returns a common completion schema.
- **HTTP transport** exposes provider discovery and OpenAI-style chat completion routes.
- **Test suite** covers configuration parsing, registry behavior, validation, and transport isolation.

## Quick start

Requires Node.js 20 or later. No external npm packages are required.

```bash
npm start
npm test
```

By default, the gateway runs in **simulation mode** for local integration testing. This mode does not send requests to upstream AI services. To enable live requests for a supported OpenAI-compatible endpoint, supply a valid credential and a corresponding `PROVIDER_BASE_URL`, then set `GATEWAY_MODE=live`. Non-compatible vendors require dedicated adapters.

## Endpoints

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Health and configuration summary |
| GET | `/v1/providers` | Provider discovery without secrets |
| POST | `/v1/chat/completions` | Unified completion interface |

Example:

```bash
curl -s http://127.0.0.1:3000/v1/chat/completions \\
  -H 'Content-Type: application/json' \\
  -d '{"provider":"openai","messages":[{"role":"user","content":"Hello"}]}'
```

## Configuration

The `.env` file defines provider credentials. All entries ending in `_API_KEY` are discovered automatically; individual vendor names need not be hardcoded. Environment variables override file values. For production, use a secrets manager and vendor-specific adapters, and avoid committing live credentials.

## Limitations

Provider discovery does not imply official API compatibility. Live routing currently supports only endpoints implementing the OpenAI-compatible chat completion request/response contract. Rate limiting, authentication, telemetry, retries, and vendor-specific adapters are future work.
