import { Clock3, Gauge, Sparkles } from 'lucide-react';

import { badgeVariants } from '@/components/ui/badge';
import type { MatchMetadata } from '@/lib/types';
import { cn } from '@/lib/utils';

export function MatchSourceBadge({ metadata }: { metadata?: MatchMetadata | null }) {
  if (!metadata) return null;

  const isGemini = metadata.source === 'gemini';
  const Icon = isGemini ? Sparkles : Gauge;
  const label = isGemini ? 'Gemini refined' : 'Local fallback';

  return (
    <span
      className={cn(
        badgeVariants({ variant: 'outline' }),
        isGemini
          ? 'gap-1.5 border-indigo-200 bg-indigo-50 text-indigo-700'
          : 'gap-1.5 border-amber-200 bg-amber-50 text-amber-800'
      )}
      title={`${metadata.candidateCount} locally shortlisted candidates were considered.`}
    >
      <Icon className="h-3 w-3" />
      {label}
      {metadata.cached && (
        <>
          <span aria-hidden="true">·</span>
          <Clock3 className="h-3 w-3" />
          Cached
        </>
      )}
    </span>
  );
}
