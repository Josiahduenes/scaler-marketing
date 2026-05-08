import { afterEach, describe, expect, test } from 'bun:test';
import { getSuperhumanMailTools, isSuperhumanMcpConfigured, superhumanMailStatusTool } from '../mcp/superhuman-mail';

const originalEnableOAuth = process.env.SUPERHUMAN_MCP_ENABLE_OAUTH;
const originalAccessToken = process.env.SUPERHUMAN_MCP_ACCESS_TOKEN;

afterEach(() => {
  if (originalEnableOAuth === undefined) delete process.env.SUPERHUMAN_MCP_ENABLE_OAUTH;
  else process.env.SUPERHUMAN_MCP_ENABLE_OAUTH = originalEnableOAuth;
  if (originalAccessToken === undefined) delete process.env.SUPERHUMAN_MCP_ACCESS_TOKEN;
  else process.env.SUPERHUMAN_MCP_ACCESS_TOKEN = originalAccessToken;
});

describe('Superhuman Mail MCP config', () => {
  test('is disabled by default without OAuth or token config', () => {
    delete process.env.SUPERHUMAN_MCP_ENABLE_OAUTH;
    delete process.env.SUPERHUMAN_MCP_ACCESS_TOKEN;

    expect(isSuperhumanMcpConfigured()).toBe(false);
  });

  test('is enabled when OAuth is explicitly enabled', () => {
    process.env.SUPERHUMAN_MCP_ENABLE_OAUTH = 'true';
    delete process.env.SUPERHUMAN_MCP_ACCESS_TOKEN;

    expect(isSuperhumanMcpConfigured()).toBe(true);
  });

  test('returns only the status tool when not configured', async () => {
    delete process.env.SUPERHUMAN_MCP_ENABLE_OAUTH;
    delete process.env.SUPERHUMAN_MCP_ACCESS_TOKEN;

    const tools = await getSuperhumanMailTools();

    expect(Object.keys(tools)).toEqual(['superhumanMailStatusTool']);
  });

  test('status tool explains missing auth', async () => {
    delete process.env.SUPERHUMAN_MCP_ENABLE_OAUTH;
    delete process.env.SUPERHUMAN_MCP_ACCESS_TOKEN;

    const result = await superhumanMailStatusTool.execute?.({}, {} as never);

    expect('configured' in result!).toBe(true);
    if ('configured' in result!) {
      expect(result.configured).toBe(false);
      expect(result.authMode).toBe('not-configured');
    }
  });
});
