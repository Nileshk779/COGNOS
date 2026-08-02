import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { colors } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import type { Opportunity } from '@/lib/types';
import OpportunityCard from '@/components/dashboard/OpportunityCard';
import EmptyState from '@/components/dashboard/EmptyState';
import { CardSkeleton } from '@/components/dashboard/CardSkeleton';

type Filter = 'all' | Opportunity['type'];

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hackathon', label: 'Hackathons' },
  { id: 'job', label: 'Jobs' },
  { id: 'event', label: 'Events' },
  { id: 'seminar', label: 'Seminars' },
];

export default function Opportunities() {
  const [filter, setFilter] = useState<Filter>('all');
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Opportunity[]>('/opportunities')
      .then(setOpportunities)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load opportunities'));
  }, []);

  const filtered = useMemo(
    () => (opportunities ? (filter === 'all' ? opportunities : opportunities.filter((o) => o.type === filter)) : []),
    [opportunities, filter]
  );

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-display" style={{ color: colors.textMain }}>
          Opportunities
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          Curated for the goals you're actively working on.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => {
          const isActive = f.id === filter;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="relative px-4 py-2 rounded-full text-sm font-medium transition-colors border"
              style={
                isActive
                  ? { backgroundColor: colors.textMain, borderColor: colors.textMain, color: '#FFFFFF' }
                  : { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {opportunities === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <p className="text-xs text-center" style={{ color: '#DC2626' }}>
          {error}
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nothing here yet" description="Check back soon — new opportunities will show up here as they're added." />
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((opp, idx) => (
            <motion.div
              key={opp.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
            >
              <OpportunityCard opportunity={opp} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
