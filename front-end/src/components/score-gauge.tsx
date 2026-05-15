import { cn } from '@/lib/utils';

export function ScoreGauge({ score, tier }: { score?: number; tier?: string }) {
  const value = Math.max(0, Math.min(100, score || 0));
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 rounded-full border border-line bg-white shadow-sm">
        <div
          className="absolute inset-1 rounded-full"
          style={{
            background: `conic-gradient(#31566d ${value * 3.6}deg, #e5ded2 0deg)`,
          }}
        />
        <div className="absolute inset-2 grid place-items-center rounded-full bg-paper text-sm font-bold">{value}</div>
      </div>
      <div>
        <div className={cn('text-xl font-black', tier === 'Reject' && 'text-danger')}>{tier || 'N/A'}</div>
        <div className="text-xs text-muted">fit score</div>
      </div>
    </div>
  );
}
