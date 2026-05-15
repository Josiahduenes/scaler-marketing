import { CheckCircle2, CircleAlert, CircleDot, Clock3, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  approved: 'border-moss/30 bg-moss/10 text-moss',
  sent: 'border-moss/30 bg-moss/10 text-moss',
  complete: 'border-moss/30 bg-moss/10 text-moss',
  running: 'border-steel/30 bg-steel/10 text-steel',
  drafted: 'border-steel/30 bg-steel/10 text-steel',
  'needs-review': 'border-warning/30 bg-warning/10 text-warning',
  'needs-revision': 'border-warning/30 bg-warning/10 text-warning',
  failed: 'border-danger/30 bg-danger/10 text-danger',
  rejected: 'border-danger/30 bg-danger/10 text-danger',
  Reject: 'border-danger/30 bg-danger/10 text-danger',
};

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  const label = value || 'unknown';
  const Icon =
    label === 'approved' || label === 'complete' || label === 'sent'
      ? CheckCircle2
      : label === 'rejected' || label === 'failed' || label === 'Reject'
        ? XCircle
        : label.includes('review') || label.includes('revision')
          ? Clock3
          : label === 'running'
            ? CircleDot
            : CircleAlert;

  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-semibold uppercase tracking-normal',
        styles[label] || 'border-line bg-white text-muted',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
