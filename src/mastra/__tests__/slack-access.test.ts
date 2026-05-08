import { afterEach, describe, expect, test } from 'bun:test';
import { isSlackAccessAllowed, parseCsvEnv } from '../utils/slack-access';

const originalChannels = process.env.SLACK_ALLOWED_CHANNEL_IDS;
const originalUsers = process.env.SLACK_ALLOWED_USER_IDS;

afterEach(() => {
  if (originalChannels === undefined) delete process.env.SLACK_ALLOWED_CHANNEL_IDS;
  else process.env.SLACK_ALLOWED_CHANNEL_IDS = originalChannels;
  if (originalUsers === undefined) delete process.env.SLACK_ALLOWED_USER_IDS;
  else process.env.SLACK_ALLOWED_USER_IDS = originalUsers;
});

describe('Slack access guard', () => {
  test('parses comma-separated env values', () => {
    expect(parseCsvEnv(' C1, C2 ,,C3 ')).toEqual(['C1', 'C2', 'C3']);
  });

  test('allows all access when no allowlists are configured', () => {
    delete process.env.SLACK_ALLOWED_CHANNEL_IDS;
    delete process.env.SLACK_ALLOWED_USER_IDS;

    expect(isSlackAccessAllowed({ channelId: 'C1', userId: 'U1' })).toBe(true);
  });

  test('blocks unknown channels when channel allowlist is configured', () => {
    process.env.SLACK_ALLOWED_CHANNEL_IDS = 'C1';
    delete process.env.SLACK_ALLOWED_USER_IDS;

    expect(isSlackAccessAllowed({ channelId: 'C1', userId: 'U1' })).toBe(true);
    expect(isSlackAccessAllowed({ channelId: 'C2', userId: 'U1' })).toBe(false);
  });

  test('blocks unknown users when user allowlist is configured', () => {
    delete process.env.SLACK_ALLOWED_CHANNEL_IDS;
    process.env.SLACK_ALLOWED_USER_IDS = 'U1';

    expect(isSlackAccessAllowed({ channelId: 'C1', userId: 'U1' })).toBe(true);
    expect(isSlackAccessAllowed({ channelId: 'C1', userId: 'U2' })).toBe(false);
  });
});
