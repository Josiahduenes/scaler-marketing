import { createTool } from '@mastra/core/tools';
import { MCPClient, MCPOAuthClientProvider, createSimpleTokenProvider } from '@mastra/mcp';
import { z } from 'zod';

const SUPERHUMAN_MCP_URL = process.env.SUPERHUMAN_MCP_URL || 'https://mcp.mail.superhuman.com/mcp';
const SUPERHUMAN_MCP_REDIRECT_URL =
  process.env.SUPERHUMAN_MCP_REDIRECT_URL || 'http://localhost:4111/oauth/superhuman/callback';

export function isSuperhumanMcpConfigured(): boolean {
  return Boolean(process.env.SUPERHUMAN_MCP_ACCESS_TOKEN || process.env.SUPERHUMAN_MCP_ENABLE_OAUTH === 'true');
}

function createSuperhumanAuthProvider() {
  const clientMetadata = {
    redirect_uris: [SUPERHUMAN_MCP_REDIRECT_URL],
    client_name: 'Scaler Marketing Mastra',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  };

  if (process.env.SUPERHUMAN_MCP_ACCESS_TOKEN) {
    return createSimpleTokenProvider(process.env.SUPERHUMAN_MCP_ACCESS_TOKEN, {
      redirectUrl: SUPERHUMAN_MCP_REDIRECT_URL,
      clientMetadata,
      refreshToken: process.env.SUPERHUMAN_MCP_REFRESH_TOKEN,
    });
  }

  return new MCPOAuthClientProvider({
    redirectUrl: SUPERHUMAN_MCP_REDIRECT_URL,
    clientMetadata,
    onRedirectToAuthorization: url => {
      console.log(`Authorize Superhuman Mail MCP: ${url.toString()}`);
    },
  });
}

export const superhumanMailMcp = new MCPClient({
  id: 'superhuman-mail',
  servers: {
    superhumanMail: {
      url: new URL(SUPERHUMAN_MCP_URL),
      authProvider: createSuperhumanAuthProvider(),
      requireToolApproval: true,
      timeout: 60_000,
    },
  },
});

export const superhumanMailStatusTool = createTool({
  id: 'superhuman-mail-status',
  description: 'Check whether the Superhuman Mail MCP integration is configured for this Mastra app.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    configured: z.boolean(),
    url: z.string(),
    authMode: z.enum(['oauth', 'token', 'not-configured']),
    message: z.string(),
  }),
  execute: async () => {
    const hasToken = Boolean(process.env.SUPERHUMAN_MCP_ACCESS_TOKEN);
    const oauthEnabled = process.env.SUPERHUMAN_MCP_ENABLE_OAUTH === 'true';
    const authMode: 'oauth' | 'token' | 'not-configured' = hasToken ? 'token' : oauthEnabled ? 'oauth' : 'not-configured';

    return {
      configured: hasToken || oauthEnabled,
      url: SUPERHUMAN_MCP_URL,
      authMode,
      message:
        hasToken || oauthEnabled
          ? 'Superhuman Mail MCP is configured. All remote mail tools require approval before execution.'
          : 'Superhuman Mail MCP is not configured. Set SUPERHUMAN_MCP_ENABLE_OAUTH=true or provide SUPERHUMAN_MCP_ACCESS_TOKEN after completing OAuth.',
    };
  },
});

export async function getSuperhumanMailTools() {
  if (!isSuperhumanMcpConfigured()) {
    return { superhumanMailStatusTool };
  }

  const tools = await superhumanMailMcp.listTools();
  return {
    superhumanMailStatusTool,
    ...tools,
  };
}
