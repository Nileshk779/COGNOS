import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Gauge, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { accents, colors } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_META } from '@/lib/constants';
import type { GrowthSnapshot, Metric, TeacherInfo } from '@/lib/types';
import StatChartCard from '@/components/dashboard/StatChartCard';
import StatTile from '@/components/dashboard/StatTile';
import AudioSnapshot from '@/components/dashboard/AudioSnapshot';
import EmptyState from '@/components/dashboard/EmptyState';
import { SkeletonBlock } from '@/components/dashboard/CardSkeleton';

// Groups the flat metrics table by metric_name — a real trend if a metric
// has 2+ recorded values, otherwise just its latest reading.
function groupMetrics(metrics: Metric[]) {
  const byName = new Map<string, Metric[]>();
  for (const m of metrics) {
    const list = byName.get(m.metric_name) ?? [];
    list.push(m);
    byName.set(m.metric_name, list);
  }
  return Array.from(byName.entries()).map(([name, rows]) => ({
    name,
    rows: rows.sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : 1)),
  }));
}

function ImageSnapshot({ isAfter, caption, statLabel, accent }: { isAfter: boolean; caption: string | null; statLabel: string | null; accent: { color: string; bg: string } }) {
  return (
    <div
      className="aspect-video rounded-2xl relative overflow-hidden flex flex-col items-center justify-center gap-2"
      style={{ background: isAfter ? `linear-gradient(135deg, ${accent.color}, ${accents.purple.color})` : 'linear-gradient(135deg, #E2E8F0, #F1F5F9)' }}
    >
      {isAfter && (
        <motion.div
          className="absolute w-24 h-24 rounded-full opacity-40 blur-2xl"
          style={{ backgroundColor: '#FFFFFF' }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <svg width="60" height="76" viewBox="0 0 72 92" className="relative">
        <circle cx="36" cy="16" r="13" fill={isAfter ? '#FFFFFF' : '#CBD5E1'} opacity={isAfter ? 0.95 : 0.8} />
        <path
          d={isAfter ? 'M14 90 L18 46 Q36 34 54 46 L58 90 L44 90 L40 58 L32 58 L28 90 Z' : 'M18 90 L20 48 Q36 40 52 48 L54 90 L42 90 L39 60 L33 60 L30 90 Z'}
          fill={isAfter ? '#FFFFFF' : '#CBD5E1'}
          opacity={isAfter ? 0.95 : 0.75}
        />
        <rect x="10" y="44" width={isAfter ? 10 : 7} height="34" rx="4" fill={isAfter ? '#FFFFFF' : '#CBD5E1'} opacity={isAfter ? 0.9 : 0.65} />
        <rect x="52" y="44" width={isAfter ? 10 : 7} height="34" rx="4" fill={isAfter ? '#FFFFFF' : '#CBD5E1'} opacity={isAfter ? 0.9 : 0.65} />
      </svg>
      <span
        className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
        style={{ backgroundColor: isAfter ? 'rgba(255,255,255,0.25)' : '#FFFFFF', color: isAfter ? '#FFFFFF' : colors.textSecondary }}
      >
        {isAfter ? 'After' : 'Before'}
      </span>
      {statLabel && (
        <span className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white" style={{ color: accent.color }}>
          <TrendingUp className="w-3 h-3" />
          {statLabel}
        </span>
      )}
      {caption && (
        <p className="absolute bottom-3 left-3 text-[10px] font-medium max-w-[70%]" style={{ color: isAfter ? 'rgba(255,255,255,0.85)' : colors.textSecondary }}>
          {caption}
        </p>
      )}
    </div>
  );
}

function CodeSnapshotView({ isAfter, code }: { isAfter: boolean; code: string | null }) {
  return (
    <div className="aspect-video rounded-2xl overflow-hidden flex flex-col font-mono text-[10px] leading-relaxed p-3" style={{ backgroundColor: '#0F172A' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="ml-2 text-[9px] uppercase tracking-wide" style={{ color: '#64748B' }}>
          {isAfter ? 'After' : 'Before'}
        </span>
      </div>
      <pre className={`whitespace-pre-wrap flex-1 ${isAfter ? 'text-emerald-400' : 'text-red-400'}`}>{code ?? '// nothing recorded yet'}</pre>
    </div>
  );
}

function RevealPanel({ before, after, accent }: { before: GrowthSnapshot | null; after: GrowthSnapshot | null; accent: { color: string; bg: string } }) {
  if (!before && !after) {
    return <EmptyState icon={Sparkles} title="No snapshot yet" description="Once a before/after moment is recorded for this goal, it'll show up here." />;
  }

  const render = (snap: GrowthSnapshot | null, isAfter: boolean) => {
    if (!snap) {
      return (
        <div className="aspect-video rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F1F5F9' }}>
          <span className="text-xs" style={{ color: colors.textSecondary }}>
            Not recorded yet
          </span>
        </div>
      );
    }
    if (snap.media_type === 'audio') {
      return (
        <AudioSnapshot
          tag={isAfter ? 'After' : 'Before'}
          transcript={snap.transcript ?? ''}
          accent={accent}
          dark={isAfter}
          rate={isAfter ? 1.05 : 0.78}
          pitch={isAfter ? 1.05 : 0.92}
        />
      );
    }
    if (snap.media_type === 'code') {
      return <CodeSnapshotView isAfter={isAfter} code={snap.transcript} />;
    }
    return <ImageSnapshot isAfter={isAfter} caption={snap.caption} statLabel={snap.stat_label} accent={accent} />;
  };

  return (
    <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
      <div>{render(before, false)}</div>
      <div className="flex justify-center">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent.bg }}>
          <ArrowRight className="w-4 h-4" style={{ color: accent.color }} />
        </div>
      </div>
      <div>{render(after, true)}</div>
    </div>
  );
}

export default function Growth() {
  const { userId } = useApp();
  const [teachers, setTeachers] = useState<TeacherInfo[] | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [snapshots, setSnapshots] = useState<GrowthSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    apiFetch<TeacherInfo[]>(`/teachers/${userId}`)
      .then((list) => {
        setTeachers(list);
        if (list.length > 0) setGoalId(list[0].goal_id);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load goals'));
  }, [userId]);

  useEffect(() => {
    if (!goalId) return;
    setMetrics(null);
    setSnapshots(null);

    apiFetch<Metric[]>(`/growth/${goalId}/metrics`).then(setMetrics).catch(() => setMetrics([]));
    apiFetch<GrowthSnapshot[]>(`/growth/${goalId}/snapshots`).then(setSnapshots).catch(() => setSnapshots([]));
  }, [goalId]);

  const goal = teachers?.find((t) => t.goal_id === goalId);
  const meta = goal ? CATEGORY_META[goal.category] : undefined;
  const accent = accents[meta?.accent ?? 'blue'];
  const grouped = metrics ? groupMetrics(metrics) : [];
  const before = snapshots?.find((s) => s.kind === 'before') ?? null;
  const after = snapshots?.find((s) => s.kind === 'after') ?? null;

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-display" style={{ color: colors.textMain }}>
          Growth
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          The proof, tracked over time.
        </p>
      </div>

      {/* GOAL SELECTOR */}
      {teachers === null ? (
        <SkeletonBlock className="h-11 w-64" />
      ) : teachers.length === 0 ? (
        <EmptyState icon={Sparkles} title="No goals yet" description="Growth tracking will appear once you have a goal." />
      ) : (
        <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 w-fit flex-wrap">
          {teachers.map((t) => {
            const isActive = t.goal_id === goalId;
            const tMeta = CATEGORY_META[t.category];
            const Icon = tMeta?.icon ?? Sparkles;
            return (
              <button
                key={t.goal_id}
                onClick={() => setGoalId(t.goal_id)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ color: isActive ? '#FFFFFF' : colors.textSecondary }}
              >
                {isActive && (
                  <motion.div
                    layoutId="growth-tab"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
                    transition={{ type: 'spring', duration: 0.4 }}
                  />
                )}
                <Icon className="w-4 h-4 relative" />
                <span className="relative">{t.goal_title}</span>
              </button>
            );
          })}
        </div>
      )}

      {goalId && (
        <AnimatePresence mode="wait">
          <motion.div
            key={goalId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* METRICS */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: colors.textMain }}>
                Metrics
              </h3>
              {metrics === null ? (
                <div className="grid grid-cols-3 gap-3">
                  <SkeletonBlock className="h-20" />
                  <SkeletonBlock className="h-20" />
                  <SkeletonBlock className="h-20" />
                </div>
              ) : grouped.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No metrics yet" description="Check-ins and completed sessions will start building your growth chart." />
              ) : (
                <div className="space-y-4">
                  {grouped.map((g) =>
                    g.rows.length >= 2 ? (
                      <StatChartCard key={g.name} label={g.name} weekly={g.rows.map((r) => r.value)} unit="" accent={meta?.accent ?? 'blue'} />
                    ) : (
                      <StatTile key={g.name} icon={Gauge} label={g.name} value={g.rows[0].value} accent={accent} />
                    )
                  )}
                </div>
              )}
            </div>

            {/* REVEAL */}
            <div className="rounded-2xl border-2 bg-white p-6" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 className="w-4 h-4" style={{ color: accent.color }} />
                <h3 className="text-sm font-semibold" style={{ color: colors.textMain }}>
                  The reveal
                </h3>
              </div>
              {snapshots === null ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <SkeletonBlock className="h-40" />
                  <SkeletonBlock className="h-40" />
                </div>
              ) : (
                <RevealPanel before={before} after={after} accent={accent} />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {error && (
        <p className="text-xs text-center" style={{ color: '#DC2626' }}>
          {error}
        </p>
      )}
    </div>
  );
}
