import { AppShell } from '@/components/app-shell';
import { WorkflowRunForm } from '@/components/workflow-run-form';

export default function NewWorkflowPage() {
  return (
    <AppShell title="Start Research Run" eyebrow="Workflow launch">
      <WorkflowRunForm />
    </AppShell>
  );
}
