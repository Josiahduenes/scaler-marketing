import { AppShell } from '@/components/app-shell';
import { AgentConsole } from '@/components/agent-console';

export default function AgentsPage() {
  return (
    <AppShell title="Agent Console" eyebrow="Mastra interaction">
      <AgentConsole />
    </AppShell>
  );
}
