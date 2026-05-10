import { Agent } from '@mastra/core/agent';
import type { ChannelHandler } from '@mastra/core/channels';
import { Memory } from '@mastra/memory';
import { createSlackAdapter } from '@chat-adapter/slack';
import { OUTREACH_RESEARCH_MODEL } from '../schemas/outreach';
import {
  getOutreachRunReviewPacketTool,
  listRecentOutreachRunsTool,
  reviseOutreachDraftTool,
  updateDraftReviewStatusTool,
} from '../tools/outreach-review-tool';
import { getSlackAccessMessage, isSlackAccessAllowed } from '../utils/slack-access';
import { getSuperhumanMailTools } from '../mcp/superhuman-mail';

const guardedDefaultHandler: ChannelHandler = async (thread, message, defaultHandler) => {
  if (!isSlackAccessAllowed({ channelId: thread.channelId, userId: message.author.userId })) {
    await thread.post(getSlackAccessMessage());
    return;
  }

  await defaultHandler(thread, message);
};

function createSlackChannelsConfig() {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
    return undefined;
  }

  return {
    adapters: {
      slack: {
        adapter: createSlackAdapter({
          botToken: process.env.SLACK_BOT_TOKEN,
          signingSecret: process.env.SLACK_SIGNING_SECRET,
        }),
        cards: true,
        gateway: false,
      },
    },
    threadContext: { maxMessages: 10 },
    tools: true,
    handlers: {
      onDirectMessage: guardedDefaultHandler,
      onMention: guardedDefaultHandler,
      onSubscribedMessage: guardedDefaultHandler,
    },
  };
}

export const scalerOutreachReviewAgent = new Agent({
  id: 'scaler-outreach-review-agent',
  name: 'Scaler Outreach Review Agent',
  instructions: `
You are Scaler Marketing's Slack-based outreach review agent.

Your job:
- Help users inspect recent Scaler outreach workflow runs.
- Show lead review packets, source evidence, fit scores, and draft quality notes.
- Revise cold email drafts when requested.
- Mark drafts as approved, rejected, or needs-revision.

Hard limits:
- Do not send emails.
- Do not contact prospects.
- Do not automate LinkedIn.
- Do not schedule calendar meetings.
- Superhuman Mail MCP tools are available only for explicitly requested mail actions and every remote mail tool requires human approval before it runs.
- Never send, reply, forward, archive, delete, or modify email/calendar data unless the user explicitly asks for that exact action and approves the tool call.
- Do not invent companies, contacts, source evidence, emails, employee counts, or revenue.
- If Xano is not configured or a record is missing, say so plainly.

Slack interaction style:
- Keep responses concise and operational.
- Ask for a workflow run ID, draft ID, lead number, or company name if the request is ambiguous.
- When showing a lead, include company, fit score, decision-maker role, evidence URLs, draft body, risk notes, and review recommendation.
- When revising copy, preserve Scaler's drafting rules: 90-140 words, plain text, one CTA, source-backed personalization, no fake familiarity, no unsupported claims.
- Approval/rejection changes must use the update-draft-review-status tool.
`,
  model: OUTREACH_RESEARCH_MODEL,
  tools: {
    listRecentOutreachRunsTool,
    getOutreachRunReviewPacketTool,
    reviseOutreachDraftTool,
    updateDraftReviewStatusTool,
    ...(await getSuperhumanMailTools()),
  },
  channels: createSlackChannelsConfig(),
  memory: new Memory({
    options: {
      workingMemory: {
        enabled: true,
        template: `# Slack Review Context
- Latest workflow run discussed:
- Drafts awaiting human review:
- User preferences for revisions:
- Open review questions:
`,
      },
    },
  }),
});
