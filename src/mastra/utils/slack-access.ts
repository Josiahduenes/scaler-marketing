type SlackAccessInput = {
  channelId?: string;
  userId?: string;
};

export function parseCsvEnv(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function isSlackAccessAllowed(input: SlackAccessInput): boolean {
  const allowedChannels = parseCsvEnv(process.env.SLACK_ALLOWED_CHANNEL_IDS);
  const allowedUsers = parseCsvEnv(process.env.SLACK_ALLOWED_USER_IDS);

  if (allowedChannels.length === 0 && allowedUsers.length === 0) {
    return true;
  }

  const channelAllowed = allowedChannels.length === 0 || Boolean(input.channelId && allowedChannels.includes(input.channelId));
  const userAllowed = allowedUsers.length === 0 || Boolean(input.userId && allowedUsers.includes(input.userId));

  return channelAllowed && userAllowed;
}

export function getSlackAccessMessage(): string {
  return 'This Slack user or channel is not allowed to use the Scaler outreach review agent.';
}
