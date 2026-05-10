import { describe, expect, test } from 'bun:test';
import { normalizeSearchResponse, runWebSearch } from '../tools/web-search-tool';
import { callXano, getXanoMinRequestIntervalMs, getXanoRequest as buildXanoRequest } from '../tools/xano-tool';

describe('Xano request mapping', () => {
  test('builds expected Xano endpoints', () => {
    expect(buildXanoRequest('get-company-by-domain', { domain: 'example.com' })).toEqual({
      method: 'GET',
      path: '/companies/by-domain?domain=example.com',
    });
    expect(buildXanoRequest('update-workflow-run', { workflowRunId: 'run-1', payload: { status: 'complete' } })).toEqual({
      method: 'PUT',
      path: '/workflow_runs/run-1',
      body: {
        status: 'complete',
        accepted_count: null,
        rejected_count: null,
        rejected_leads_json: null,
        summary: null,
        error_message: null,
        completed_at: null,
      },
    });
    expect(buildXanoRequest('list-workflow-runs', { limit: 10 })).toEqual({
      method: 'GET',
      path: '/workflow_runs?limit=10',
    });
    expect(buildXanoRequest('upsert-prospect', { payload: { company_id: 1, title: 'VP of Sales', role_type: 'buyer' } })).toEqual({
      method: 'POST',
      path: '/prospects/upsert',
      body: {
        company_id: 1,
        name: null,
        title: 'VP of Sales',
        role_type: 'buyer',
        linkedin_url: null,
        email: null,
        confidence: 0.5,
        source_url: null,
      },
    });
    expect(buildXanoRequest('get-workflow-run', { workflowRunId: 'run-1' })).toEqual({
      method: 'GET',
      path: '/workflow_runs/run-1',
    });
    expect(buildXanoRequest('update-outreach-draft', { draftId: 'draft-1', payload: { status: 'approved' } })).toEqual({
      method: 'PUT',
      path: '/outreach_drafts/draft-1',
      body: {
        status: 'approved',
        reviewer_note: null,
        revision_instruction: null,
        updated_at: null,
      },
    });
  });

  test('adds explicit values for Xano optional fields that are required by deployed validation', () => {
    expect(buildXanoRequest('create-workflow-run', { payload: { status: 'running' } })).toEqual({
      method: 'POST',
      path: '/workflow_runs',
      body: {
        input_json: {},
        status: 'running',
        accepted_count: 0,
        rejected_count: 0,
        rejected_leads_json: [],
        summary: null,
        error_message: 'none',
      },
    });

    expect(
      buildXanoRequest('create-outreach-draft', {
        payload: {
          company_id: 1,
          workflow_run_id: 2,
          body: 'Draft body',
          subject_lines_json: undefined,
        },
      }),
    ).toEqual({
      method: 'POST',
      path: '/outreach_drafts',
      body: {
        company_id: 1,
        prospect_id: null,
        workflow_run_id: 2,
        subject_lines_json: null,
        body: 'Draft body',
        teardown_bullets_json: [],
        personalization_json: [],
        risk_notes_json: [],
        draft_quality_json: {},
        status: 'needs-review',
        reviewer_note: null,
        revision_instruction: null,
      },
    });
  });

  test('calls Xano with bearer auth when configured', async () => {
    const originalBaseUrl = process.env.XANO_BASE_URL;
    const originalToken = process.env.XANO_API_TOKEN;
    process.env.XANO_BASE_URL = 'https://xano.example/api';
    process.env.XANO_API_TOKEN = 'secret-token';

    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: 123 }), { status: 200 });
    };

    const result = await callXano('upsert-company', { payload: { name: 'Acme' } }, fetchImpl as typeof fetch);

    expect(result.configured).toBe(true);
    expect(calls[0].url).toBe('https://xano.example/api/companies/upsert');
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
    expect(calls[0].init?.body).toBe(JSON.stringify({
      website_url: null,
      industry: null,
      employee_count_min: null,
      employee_count_max: null,
      revenue_estimate: null,
      city: null,
      state: null,
      country: 'US',
      ownership_type: null,
      name: 'Acme',
    }));

    if (originalBaseUrl === undefined) delete process.env.XANO_BASE_URL;
    else process.env.XANO_BASE_URL = originalBaseUrl;
    if (originalToken === undefined) delete process.env.XANO_API_TOKEN;
    else process.env.XANO_API_TOKEN = originalToken;
  });

  test('uses a conservative Xano free-tier request interval by default', () => {
    const originalInterval = process.env.XANO_MIN_REQUEST_INTERVAL_MS;
    delete process.env.XANO_MIN_REQUEST_INTERVAL_MS;

    expect(getXanoMinRequestIntervalMs()).toBe(2200);

    process.env.XANO_MIN_REQUEST_INTERVAL_MS = '2500';
    expect(getXanoMinRequestIntervalMs()).toBe(2500);

    if (originalInterval === undefined) delete process.env.XANO_MIN_REQUEST_INTERVAL_MS;
    else process.env.XANO_MIN_REQUEST_INTERVAL_MS = originalInterval;
  });
});

describe('web search response normalization', () => {
  test('normalizes common search response shapes', () => {
    expect(
      normalizeSearchResponse({
        organic: [{ title: 'Acme', link: 'https://acme.com', snippet: 'Industrial machinery' }],
      }),
    ).toEqual([{ title: 'Acme', url: 'https://acme.com', snippet: 'Industrial machinery' }]);
  });

  test('calls Firecrawl search with POST payload', async () => {
    const originalBaseUrl = process.env.WEB_SEARCH_BASE_URL;
    const originalApiKey = process.env.WEB_SEARCH_API_KEY;
    process.env.WEB_SEARCH_BASE_URL = 'https://api.firecrawl.dev/v2/search';
    process.env.WEB_SEARCH_API_KEY = 'fc-test';

    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            web: [{ title: 'Acme', url: 'https://acme.com', description: 'Industrial machinery' }],
          },
        }),
      );
    };

    const results = await runWebSearch('industrial machinery', 5, fetchImpl as unknown as typeof fetch);

    expect(calls[0].url).toBe('https://api.firecrawl.dev/v2/search');
    expect(calls[0].init?.method).toBe('POST');
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer fc-test');
    expect(calls[0].init?.body).toBe(JSON.stringify({ query: 'industrial machinery', limit: 5, sources: ['web'] }));
    expect(results).toEqual([{ title: 'Acme', url: 'https://acme.com', snippet: 'Industrial machinery' }]);

    if (originalBaseUrl === undefined) delete process.env.WEB_SEARCH_BASE_URL;
    else process.env.WEB_SEARCH_BASE_URL = originalBaseUrl;
    if (originalApiKey === undefined) delete process.env.WEB_SEARCH_API_KEY;
    else process.env.WEB_SEARCH_API_KEY = originalApiKey;
  });

  test('surfaces search provider errors', async () => {
    const originalBaseUrl = process.env.WEB_SEARCH_BASE_URL;
    process.env.WEB_SEARCH_BASE_URL = 'https://search.example/api';
    const fetchImpl = async () => new Response('nope', { status: 500, statusText: 'Server Error' });

    await expect(runWebSearch('industrial machinery', 5, fetchImpl as unknown as typeof fetch)).rejects.toThrow('Web search failed');

    if (originalBaseUrl === undefined) delete process.env.WEB_SEARCH_BASE_URL;
    else process.env.WEB_SEARCH_BASE_URL = originalBaseUrl;
  });
});
