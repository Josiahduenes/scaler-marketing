# Scaler Marketing Outreach Agent Project Plan

## Summary

Build a Mastra-based cold outreach system for Scaler Marketing that researches high-fit specialty industrial B2B service companies, scores ICP fit, drafts source-backed cold emails, persists reviewable records in Xano, and supports human review through Mastra Studio and Slack.

V1 is a research, drafting, review, and audit system. It does not autonomously send email, automate LinkedIn, book meetings, or run drip campaigns.

## Current State

The repo now contains:

- Mastra agents for market research, prospect scoring, outreach drafting, and Slack review.
- `industrial-lead-research-workflow` for discovery, dedupe, research, scoring, drafting, persistence, and review packet output.
- Xano client tooling in Mastra for CRM persistence.
- Slack Channels integration for review conversations.
- Optional Superhuman Mail MCP integration with approval required for remote mail tools.
- XanoScript backend scaffold under `xano-backend/`.
- Tests for core outreach utilities, Xano request mapping, Slack access checks, Superhuman MCP config, and review tool behavior.

Verification status:

- `bun test` passes.
- `bunx tsc --noEmit` passes.
- XanoScript validation passes for `xano-backend`.
- `bun run build` bundled the app, then stalled during Mastra's internal dependency install step. Treat this as a packaging/deploy issue to resolve before production deployment.

## V1 Goal

Create a repeatable workflow that can:

1. Find candidate U.S. specialty industrial B2B service companies.
2. Deduplicate companies by normalized domain.
3. Research public website/search evidence.
4. Score fit against the default ICP.
5. Infer likely buyer/champion role without fabricating personal details.
6. Draft a concise source-backed cold email and teardown bullets.
7. Persist companies, prospects, research reports, fit scores, drafts, review state, and audit events in Xano.
8. Return review packets in Mastra Studio and support Slack review.
9. Track approved email outbox/send events when Superhuman MCP send flows are later enabled.

## Default ICP

Target:

- Industry: Specialty industrial services, contract manufacturing, specialty processing, precision fabrication
- Size: 200-1,000 employees, or roughly $50M-$250M revenue
- Geography: United States, with priority hubs in Houston, Dallas, Charlotte, Cleveland, and Fort Worth
- Ownership: private, PE-backed, or public
- End markets: general industrial, oil & gas / energy, medical device / life sciences manufacturing
- Decision makers: VP Sales, VP of Business Development, President
- Champions: Marketing Manager, Marketing Director

Qualifying signals:

- Outdated website with no case studies or proof of process
- Active sales team with no digital support
- Serving multiple end markets with no clear positioning per vertical
- Recent expansion or new service line launch
- PE-backed with a growth mandate
- Hiring BD or sales roles
- Visible at trade shows with no follow-up infrastructure
- Website reads like a brochure from 2012

Disqualifiers:

- Under $20M revenue or fewer than 50 employees
- Purely consumer-facing work
- No defined B2B sales motion
- Single-customer dependency (captive supplier)
- International-only operations

Positioning:

For specialty industrial service companies that have built their reputation on precision and reliability but whose website and marketing do not reflect it, Scaler builds the digital presence and lead gen system that matches the quality of the work they actually do.

## Architecture

Mastra is the workflow and agent runtime.

Xano is the operational CRM/audit backend.

Slack is the human review channel.

Superhuman Mail MCP is optional and approval-gated. V1 can track send state, but should not send unless a human explicitly asks for and approves the mail tool call.

## Key Source Areas

Mastra:

- `src/mastra/index.ts`
- `src/mastra/workflows/industrial-lead-research-workflow.ts`
- `src/mastra/agents/market-research-agent.ts`
- `src/mastra/agents/prospect-scoring-agent.ts`
- `src/mastra/agents/outreach-draft-agent.ts`
- `src/mastra/agents/scaler-outreach-review-agent.ts`
- `src/mastra/tools/xano-tool.ts`
- `src/mastra/tools/outreach-review-tool.ts`
- `src/mastra/tools/web-search-tool.ts`
- `src/mastra/tools/page-fetch-tool.ts`
- `src/mastra/tools/dedupe-tool.ts`
- `src/mastra/mcp/superhuman-mail.ts`
- `src/mastra/schemas/outreach.ts`
- `src/mastra/scorers/outreach-scorer.ts`

Xano:

- `xano-backend/api/scaler_outreach/`
- `xano-backend/table/`
- `xano-backend/function/security/require_service_token.xs`
- `xano-backend/function/shared/normalize_domain.xs`

## Xano Backend Contract

API group:

- Name: `Scaler Outreach`
- Canonical: `scaler-outreach`
- Expected base URL format: `https://your-instance.xano.io/api:scaler-outreach`

Authentication:

- All non-health endpoints require `Authorization: Bearer <XANO_API_TOKEN>`.
- The same service token must be configured in both Mastra `.env` and Xano environment variables.

Core tables:

- `company`
- `prospect`
- `workflow_run`
- `research_report`
- `fit_score`
- `outreach_draft`
- `review_event`
- `email_outbox`
- `email_event`
- `suppression`
- `api_request_log`

Required endpoints:

- `GET /health`
- `GET /companies/by-domain?domain=...`
- `POST /companies/upsert`
- `POST /prospects/upsert`
- `POST /workflow_runs`
- `GET /workflow_runs?limit=...`
- `GET /workflow_runs/{workflow_run_id}`
- `PUT /workflow_runs/{workflow_run_id}`
- `POST /research_reports`
- `GET /research_reports?workflow_run_id=...`
- `POST /fit_scores`
- `GET /fit_scores?workflow_run_id=...`
- `POST /outreach_drafts`
- `GET /outreach_drafts?workflow_run_id=...`
- `GET /outreach_drafts/{draft_id}`
- `PUT /outreach_drafts/{draft_id}`
- `POST /review_events`
- `POST /email_outbox`
- `GET /email_outbox?status=...&limit=...`
- `PUT /email_outbox/{outbox_id}`
- `POST /email_events`
- `GET /email_events?draft_id=...`
- `POST /suppressions/upsert`
- `GET /suppressions/by-email?email=...`
- `GET /suppressions/by-domain?domain=...`

## Environment Setup

Required:

```sh
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
WEB_SEARCH_API_KEY=
WEB_SEARCH_BASE_URL=
XANO_BASE_URL=https://your-instance.xano.io/api:scaler-outreach
XANO_API_TOKEN=
OUTREACH_CRON_ENABLED=false
OUTREACH_CRON=0 8 * * 1-5
OUTREACH_CRON_TIMEZONE=America/Chicago
OUTREACH_CRON_TARGET_COUNT=10
OUTREACH_CRON_MAX_SEARCH_RESULTS=50
OUTREACH_CRON_MINIMUM_FIT_SCORE=75
OUTREACH_CRON_LOCATIONS=Houston,Dallas,Charlotte,Cleveland,Fort Worth
```

Slack review:

```sh
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_ALLOWED_CHANNEL_IDS=
SLACK_ALLOWED_USER_IDS=
```

Superhuman Mail MCP:

```sh
SUPERHUMAN_MCP_URL=https://mcp.mail.superhuman.com/mcp
SUPERHUMAN_MCP_ENABLE_OAUTH=true
SUPERHUMAN_MCP_REDIRECT_URL=http://localhost:4111/oauth/superhuman/callback
SUPERHUMAN_MCP_ACCESS_TOKEN=
SUPERHUMAN_MCP_REFRESH_TOKEN=
```

## External Services To Set Up

### Xano

1. Sync or import `xano-backend/` into the target Xano workspace.
2. Set Xano env var `XANO_API_TOKEN`.
3. Confirm `GET /health` works.
4. Confirm authenticated endpoints reject missing tokens.
5. Confirm `POST /companies/upsert` and `GET /companies/by-domain` work with the same domain.

### Search Provider

Choose a web search provider and configure:

- `WEB_SEARCH_BASE_URL`
- `WEB_SEARCH_API_KEY`

The provider response should include result URLs and snippets. The current normalizer supports common `organic`, `results`, and `items` response shapes.

### Slack

1. Create a Slack app.
2. Add bot token and signing secret to env.
3. Configure allowed channel/user IDs.
4. Route Slack events to the Mastra Channels endpoint once the app server is running.
5. Test listing recent workflow runs and approving/rejecting a draft.

### Superhuman

1. Configure the remote MCP server URL.
2. Complete OAuth or provide access/refresh tokens.
3. Keep remote mail tools approval-gated.
4. Do not enable automatic sends in V1.

## Workflow Behavior

Default input:

```json
{
  "targetCount": 10,
  "locations": ["Houston", "Dallas", "Charlotte", "Cleveland", "Fort Worth"],
  "maxSearchResults": 50,
  "minimumFitScore": 75
}
```

High-level flow:

1. Create workflow run.
2. Search for candidate companies.
3. Normalize and dedupe domains.
4. Fetch company website text.
5. Build source-backed research evidence.
6. Score ICP fit.
7. Infer likely buyer role.
8. Draft email and teardown bullets.
9. Score draft quality.
10. Persist results to Xano.
11. Return review packet to Mastra Studio.

## Scheduled Runs

Mastra supports declarative cron schedules on workflows. The outreach workflow has an opt-in schedule configured through environment variables.

Default schedule settings:

```sh
OUTREACH_CRON_ENABLED=false
OUTREACH_CRON=0 8 * * 1-5
OUTREACH_CRON_TIMEZONE=America/Chicago
OUTREACH_CRON_TARGET_COUNT=10
OUTREACH_CRON_MAX_SEARCH_RESULTS=50
OUTREACH_CRON_MINIMUM_FIT_SCORE=75
OUTREACH_CRON_LOCATIONS=Houston,Dallas,Charlotte,Cleveland,Fort Worth
```

Behavior:

- Schedules are disabled unless `OUTREACH_CRON_ENABLED=true`.
- When enabled, Mastra registers the schedule when the app boots.
- Scheduled runs use the same workflow path as manual runs.
- Scheduled runs require a long-lived Mastra process; serverless platforms will not reliably fire the built-in scheduler.
- Scheduled runs consume model, search, page-fetch, and Xano API budget.

## Drafting Rules

Cold email drafts must:

- Be 90-140 words.
- Use plain text.
- Include one clear CTA.
- Avoid fake familiarity.
- Avoid unsupported performance claims.
- Mention 1-2 specific sourced observations.
- Frame around pipeline, buyer clarity, and converting engineering expertise into inbound leads.
- Offer a custom teardown / digital pipeline audit.

Default CTA:

```txt
Worth me sending over a quick teardown of where your site may be leaking qualified industrial buyers?
```

## Human Review Rules

V1 review happens in Mastra Studio and Slack.

Draft review statuses:

- `needs-review`
- `approved`
- `rejected`
- `needs-revision`

Every approval, rejection, or revision request should create a `review_event` record in Xano.

No outbound send should happen as part of the research workflow.

## Send Tracking Rules

The backend supports send tracking through:

- `email_outbox`
- `email_event`
- `suppression`

Allowed send lifecycle:

- `drafted`
- `approved_to_send`
- `send_requested`
- `sent`
- `failed`
- `cancelled`

Rules:

- Creating an outbox row does not send email.
- A send tool call must require human approval.
- Suppression records block outbox creation for matching emails/domains.
- Provider IDs from Superhuman/Gmail should be stored when available.

## Test Plan

Local checks:

```sh
bun test
bunx tsc --noEmit
bun run build
```

Xano checks:

```sh
xano validate xano-backend
```

Or use the Xano MCP validator for all `.xs` files.

Manual acceptance tests:

1. `GET /health` returns `{ "ok": true }`.
2. Authenticated Xano endpoint rejects missing/invalid token.
3. Company upsert normalizes and dedupes a domain.
4. A workflow run creates records in `workflow_run`, `company`, `prospect`, `research_report`, `fit_score`, and `outreach_draft`.
5. Slack review can fetch a run and update draft status.
6. Draft status updates create `review_event` rows.
7. Suppressed email/domain blocks `email_outbox` creation.
8. Superhuman tools remain approval-gated.

## Known Issues

`bun run build` currently reaches Mastra bundling successfully, then stalls during the internal dependency install step. The TypeScript code and tests are clean, so debug this before production deploy.

Potential areas to inspect:

- Mastra build output dependency install logs
- Bun lockfile/package manager mismatch
- Network or registry access during build install
- Large generated bundle or dependency that slows install

## Near-Term Build Phases

### Phase 1: Xano Deployment

- Sync `xano-backend/`.
- Set Xano env vars.
- Smoke test health/auth/company endpoints.
- Export/check OpenAPI spec if needed.

### Phase 2: Mastra Local Run

- Set `.env`.
- Run `npm run dev`.
- Open Mastra Studio at `localhost:4111`.
- Run `industrial-lead-research-workflow` with a small `targetCount`.
- Confirm Xano persistence.

### Phase 3: Review Loop

- Configure Slack app.
- Test list-run, fetch-review-packet, approve, reject, and revise flows.
- Confirm `review_event` audit rows.

### Phase 4: Search Quality

- Tune web search provider queries.
- Add Clay/CSV import if needed.
- Improve research evidence extraction if too many low-quality candidates pass discovery.

### Phase 5: Send Tracking

- Complete Superhuman MCP auth.
- Add explicit approved-send flow around `email_outbox`.
- Track send results in `email_event`.
- Keep every send approval-gated.

### Phase 6: Production Readiness

- Fix `bun run build` stall.
- Add deployment env configuration.
- Add operational logging around Xano failures.
- Add retry/backoff for search/page fetch calls.
- Add monitoring for workflow failures and rejected candidate counts.

## Out Of Scope For V1

- Fully automated email sending.
- Drip campaign automation.
- LinkedIn connection requests or DMs.
- Calendar scheduling.
- Paid contact enrichment.
- Scraping behind logins.
- Slack/Discord approval beyond draft review actions.

## Operating Principles

- Every factual claim about a company must have a source URL or be marked unknown.
- Dedupe by normalized domain before researching or drafting.
- Do not fabricate people, emails, revenue, employee counts, or private analytics.
- Keep emails concise, specific, and source-backed.
- Keep human approval between the system and any outbound communication.
