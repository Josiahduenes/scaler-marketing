# Xano Workspace Environment Setup

This file lists the environment values that live inside Xano for the Scaler Outreach backend.

The Mastra server has its own `.env` file. Those values are listed separately near the bottom only so the Xano value can be matched to the Mastra value.

## Xano Workspace Environment Variables

Create this inside the Xano workspace that contains `xano-backend/`.

```sh
XANO_API_TOKEN=
```

That is the only custom Xano workspace environment variable the Scaler Outreach API currently reads.

Confirmed XanoScript references:

- `xano-backend/function/security/require_service_token.xs` reads `$env.XANO_API_TOKEN`.
- Xano system env values like `$env.$http_headers` are provided by Xano and do not need to be created manually.

### `XANO_API_TOKEN`

Purpose:

- Shared service token used to protect the Scaler Outreach API group.
- Xano checks this value in `function/security/require_service_token.xs`.
- Mastra sends the same value in the `Authorization` header.

Recommended value:

- Generate a long random secret.
- Treat it like a backend API key.
- Do not commit it to git.
- Do not expose it in frontend code.

Example request header:

```http
Authorization: Bearer your-long-random-token
```

## Xano API Group

The backend API group is defined at:

```txt
xano-backend/api/scaler_outreach/api_group.xs
```

Current API group settings:

```txt
Name: Scaler Outreach
Canonical: scaler-outreach
```

Expected deployed base URL:

```sh
https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach
```

This is the Scaler Outreach API group base URL for the live Xano workspace currently configured in the local Xano CLI profile.

## Live API Groups Reviewed

The local Xano CLI profile points at:

```txt
Workspace: 159560
Branch: v1
Instance origin: https://x8ki-letl-twmt.n7.xano.io
```

The live workspace currently has these API groups:

| Group | Canonical | Base URL | Notes |
| --- | --- | --- | --- |
| `Authentication` | `u-JIzwpe` | `https://x8ki-letl-twmt.n7.xano.io/api:u-JIzwpe` | Xano quick-start auth group. Not used by Mastra outreach. |
| `Event Logs` | `RbXJXtjZ` | `https://x8ki-letl-twmt.n7.xano.io/api:RbXJXtjZ` | Xano quick-start event log group. Not used by Mastra outreach. |
| `scaler_outreach` | `3nEG6HV7` | `https://x8ki-letl-twmt.n7.xano.io/api:3nEG6HV7` | Older/placeholder Scaler group. Endpoints are mostly empty and use names like `workflow_runs_create`; do not use for Mastra. |
| `Scaler Outreach` | `scaler-outreach` | `https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach` | Correct group for this project. Endpoint paths match `src/mastra/tools/xano-tool.ts`. |
 
Use `https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach` for `XANO_BASE_URL`.

## Local Mastra `.env`

These do not live in Xano. Set these on the Mastra server in the repo-level `.env` file.

```sh
XANO_BASE_URL=https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach
XANO_API_TOKEN=the-same-token-you-set-in-xano
```

### `XANO_BASE_URL`

Purpose:

- Tells Mastra where to call the Xano Scaler Outreach API group.
- Should point to the API group base URL, not the Xano workspace root.

Correct:

```sh
XANO_BASE_URL=https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach
```

Incorrect:

```sh
XANO_BASE_URL=https://x8ki-letl-twmt.n7.xano.io
XANO_BASE_URL=https://x8ki-letl-twmt.n7.xano.io/api:meta
XANO_BASE_URL=https://x8ki-letl-twmt.n7.xano.io/api:3nEG6HV7
```

### `XANO_API_TOKEN`

Purpose:

- Same service token configured in Xano.
- Used by `src/mastra/tools/xano-tool.ts`.

Mastra sends:

```http
Authorization: Bearer ${XANO_API_TOKEN}
```

## Required Smoke Tests

After syncing the Xano backend and setting env vars, test these in order.

### 1. Health Check

```sh
curl https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach/health
```

Expected:

```json
{
  "ok": true,
  "service": "scaler_outreach"
}
```

### 2. Auth Rejection

```sh
curl https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach/companies/by-domain?domain=example.com
```

Expected:

- Request should fail because no bearer token was provided.

### 3. Authenticated Company Upsert

```sh
curl -X POST https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach/companies/upsert \
  -H "Authorization: Bearer your-long-random-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Manufacturing",
    "domain": "https://www.example.com/about",
    "website_url": "https://www.example.com",
    "industry": "Industrial Machinery Manufacturing",
    "country": "US"
  }'
```

Expected:

- Xano returns a `company` record.
- The stored `domain` should be normalized to `example.com`.

### 4. Authenticated Company Lookup

```sh
curl "https://x8ki-letl-twmt.n7.xano.io/api:scaler-outreach/companies/by-domain?domain=example.com" \
  -H "Authorization: Bearer your-long-random-token"
```

Expected:

- Xano returns the same company record created in the previous step.

## Full Local Verification

After Xano smoke tests pass, run locally:

```sh
bun test
bunx tsc --noEmit
npm run dev
```

Then open Mastra Studio at:

```txt
http://localhost:4111
```

Run `industrial-lead-research-workflow` with a small test input:

```json
{
  "targetCount": 1,
  "maxSearchResults": 5
}
```

Expected:

- A `workflow_run` record is created in Xano.
- Accepted leads create `company`, `prospect`, `research_report`, `fit_score`, and `outreach_draft` records.
- Rejected candidates are stored on `workflow_run.rejected_leads_json`.

## Related Local Variables

These are also Mastra server `.env` variables. Do not create these in Xano unless a future Xano function explicitly needs them.

```sh
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
WEB_SEARCH_API_KEY=
WEB_SEARCH_BASE_URL=
```

Slack review:

```sh
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_ALLOWED_CHANNEL_IDS=
SLACK_ALLOWED_USER_IDS=
```

Superhuman MCP:

```sh
SUPERHUMAN_MCP_URL=https://mcp.mail.superhuman.com/mcp
SUPERHUMAN_MCP_ENABLE_OAUTH=false
SUPERHUMAN_MCP_REDIRECT_URL=http://localhost:4111/oauth/superhuman/callback
SUPERHUMAN_MCP_ACCESS_TOKEN=
SUPERHUMAN_MCP_REFRESH_TOKEN=
```
