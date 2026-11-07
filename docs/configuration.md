# Configuration

Explicit config beats `BRAYER_*` env beats defaults. Integer knobs refuse
malformed values; unknown explicit keys refuse as typos. Env keys unknown to
the core are ignored — the tables below list every accepted key per process.

## Core daemon (`@igorjpimenta/brayer`)

Resolved in [`src/config.js`](../src/config.js).

| Knob | Env | Default |
| --- | --- | --- |
| Store path | `BRAYER_DB` | `~/.brayer/store.sqlite` |
| Blobs path | `BRAYER_BLOBS` | `~/.brayer/blobs` |
| Claim lease | `BRAYER_LEASE_SECONDS` | `1800` |
| Attempt cap | `BRAYER_MAX_ATTEMPTS` | `3` |
| HTTP MCP port | `BRAYER_HTTP_PORT` | `38293` |
| Event stream (WS) port | `BRAYER_WS_PORT` | `38294` |
| HTTP MCP bearer | `BRAYER_MCP_BEARER` | required for HTTP MCP |
| Claim webhook URL | `BRAYER_CLAIM_WEBHOOK_URL` | unset |
| Claim webhook bearer | `BRAYER_CLAIM_WEBHOOK_BEARER` | unset |
| Claim webhook timeout | `BRAYER_CLAIM_WEBHOOK_TIMEOUT_MS` | `3000` |
| Per-harness webhook map | `BRAYER_CLAIM_WEBHOOKS` | `{}` |

Harness-side identity knobs:

| Knob | Applies to | Notes |
| --- | --- | --- |
| `BRAYER_HARNESS` | stdio MCP and the event stream | required for stdio; must not cross into HTTP minting |
| `BRAYER_AGENT` | OpenCode adapter | fallback when the session agent cannot be captured |

The OpenClaw adapter reads no environment: its transport config lives in
`openclaw.json` (`mcp.servers.brayer.headers`, incl.
`X-Brayer-Harness`), and its claim webhook route is registered in the store via
`brayer webhook set` rather than an env ([webhooks](webhooks.md)).

Flags on `brayer serve` override ports per launch: `--mcp http --port N`,
`--host H`, `--ws --port N`.

## Wake bridge (`@igorjpimenta/brayer-opencode`)

Read by the wake bridge inside the OpenCode plugin process
([`plugins/opencode/brayer/wake.js`](../plugins/opencode/brayer/wake.js)), not
by the core daemon. The listen port is a constructor default, not an env.

| Env | Default | Notes |
| --- | --- | --- |
| `BRAYER_WAKE_BEARER` | required | bearer checked on every wake request |
| `BRAYER_OPENCODE_URL` | `http://127.0.0.1:4096` | OpenCode SDK base URL |
| listen port | `38295` | constructor argument (`createWakeServer({ port })`) |
