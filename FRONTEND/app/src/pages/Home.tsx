import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ListChecks, Flame, AlertTriangle, ArrowRight, Zap, Target, GraduationCap } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { accents, colors, heroSurface } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_META } from '@/lib/constants';
import type { ContentType } from '@/lib/theme';
import type { GoalSummary, PathItemWithContent } from '@/lib/types';
import StepCard from '@/components/dashboard/StepCard';
import StatTile from '@/components/dashboard/StatTile';
import EmptyState from '@/components/dashboard/EmptyState';
import { CardSkeleton, SkeletonBlock } from '@/components/dashboard/CardSkeleton';

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Working late';
}

export default function Home() {
  const { setActiveTab, setSelectedGoalId, userId } = useApp();

  const [summary, setSummary] = useState<GoalSummary[] | null>(null);
  const [steps, setSteps] = useState<PathItemWithContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setSummary(null);
    setSteps(null);
    setError(null);

    apiFetch<GoalSummary[]>(`/home/summary/${userId}`)
      .then(setSummary)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load goals'));

    apiFetch<PathItemWithContent[]>(`/home/today-steps/${userId}`)
      .then(setSteps)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load steps'));
  }, [userId]);

  const goToTeacher = (goalId: string) => {
    setSelectedGoalId(goalId);
    setActiveTab('Teachers');
  };

  const goalByIdLocal = (id: string) => summary?.find((g) => g.goal_id === id);

  const combinedStreak = summary?.reduce((sum, g) => sum + g.streak_days, 0) ?? 0;
  const activeGoalsCount = summary?.length ?? 0;
  // Simple, non-AI heuristic derived straight from returned data — a goal
  // with a broken streak visually needs a nudge. Every OTHER goal still
  // renders below regardless of its own streak value.
  const attentionGoal = summary?.find((g) => g.streak_days === 0);
  const otherGoals = summary?.filter((g) => g.goal_id !== attentionGoal?.goal_id) ?? [];

  const pendingSteps = steps?.filter((s) => s.status !== 'done') ?? [];
  const doneSteps = steps?.filter((s) => s.status === 'done') ?? [];

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* HERO GREETING */}
      <motion.div
        className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
        style={{ background: heroSurface }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 dot-grid-light opacity-[0.4] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-24 -right-16 w-64 h-64 rounded-full opacity-25"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full opacity-15"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #10B981)' }}
            animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-5"
            style={{ backgroundColor: 'rgba(139,92,246,0.18)', color: '#C4B5FD' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Future Self
          </div>
          <p className="text-sm font-medium mb-2" style={{ color: '#93C5FD' }}>
            {timeOfDayGreeting()}.
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white leading-snug tracking-tight max-w-2xl font-display">
            {activeGoalsCount > 0 ? "Here's where things stand today." : 'Your goals will show up here once you start one.'}
          </h1>
        </div>
      </motion.div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summary === null ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-[72px]" />)
        ) : (
          <>
            <StatTile icon={Flame} label="Combined streak" value={`${combinedStreak}d`} accent={accents.amber} />
            <StatTile icon={Target} label="Active goals" value={activeGoalsCount} accent={accents.blue} />
            <StatTile icon={Zap} label="Total tasks" value={pendingSteps.length} accent={accents.pink} />
            <StatTile icon={GraduationCap} label="Goals needing attention" value={summary.filter((g) => g.streak_days === 0).length} accent={accents.emerald} />
          </>
        )}
      </div>

      {/* GOALS */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: colors.textSecondary }}>
          Your goals
        </h2>

        {summary === null ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : summary.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No goals yet"
            description="Start by talking to a teacher — Ava, Coach Rhea, or Nova — to set your first goal."
            actionLabel="Meet your teachers"
            onAction={() => setActiveTab('Teachers')}
          />
        ) : (
          <>
            {attentionGoal && (
              <motion.button
                onClick={() => goToTeacher(attentionGoal.goal_id)}
                className="relative w-full text-left rounded-3xl p-6 sm:p-7 border-2 overflow-hidden mb-4"
                style={{ borderColor: '#FBBF24', backgroundColor: '#FFFBEB' }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(251,191,36,0.25)' }}
              >
                <motion.span
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: '#F59E0B', opacity: 0.2 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.35, 0.2] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-bold"
                      style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}
                    >
                      {CATEGORY_META[attentionGoal.category]?.teacherName?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <span
                        className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full w-fit mb-2"
                        style={{ backgroundColor: '#FDE68A', color: '#92400E' }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Needs attention
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold font-display" style={{ color: '#78350F' }}>
                        {attentionGoal.title}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: '#92400E' }}>
                        {CATEGORY_META[attentionGoal.category]?.teacherName} · no streak yet
                      </p>
                    </div>
                  </div>
                  <motion.div
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white flex-shrink-0 self-start sm:self-center"
                    style={{ backgroundColor: '#D97706' }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Jump back in
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </div>
              </motion.button>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {otherGoals.map((goal, idx) => {
                const meta = CATEGORY_META[goal.category];
                const accent = accents[meta?.accent ?? 'blue'];
                return (
                  <motion.button
                    key={goal.goal_id}
                    onClick={() => goToTeacher(goal.goal_id)}
                    className="relative w-full text-left rounded-2xl p-5 border-2 bg-white flex items-center gap-4"
                    style={{ borderColor: colors.border }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + idx * 0.06, duration: 0.3 }}
                    whileHover={{ y: -5, borderColor: accent.color, boxShadow: `0 16px 32px ${accent.bg}90` }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold" style={{ backgroundColor: accent.bg, color: accent.color }}>
                      {meta?.teacherName?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold" style={{ color: colors.textMain }}>
                        {goal.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Flame className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} fill="#F59E0B" />
                        <span className="text-xs font-bold" style={{ color: colors.textMain }}>
                          {goal.streak_days}d streak
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 truncate" style={{ color: colors.textSecondary }}>
                        {meta?.label} · {goal.last_activity ? new Date(goal.last_activity).toLocaleDateString() : 'No activity yet'}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* TASKS */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ListChecks className="w-4 h-4" style={{ color: colors.textSecondary }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
            Your Tasks
          </h2>
        </div>
        {steps === null ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : steps.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description="Once your teacher builds out your path, tasks will show up here."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {pendingSteps.map((step, idx) => {
                const goal = goalByIdLocal(step.goal_id);
                const meta = goal ? CATEGORY_META[goal.category] : undefined;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05, duration: 0.3 }}
                  >
                    <StepCard
                      title={step.title ?? 'Untitled content'}
                      type={(step.source_type as ContentType) ?? 'article'}
                      meta={step.difficulty ?? ''}
                      goalName={meta?.label}
                      goalAccent={meta?.accent}
                      url={step.url ?? undefined}
                      onClick={() => goToTeacher(step.goal_id)}
                    />
                  </motion.div>
                );
              })}
            </div>

            {doneSteps.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textSecondary }}>
                  Completed
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {doneSteps.map((step) => {
                    const goal = goalByIdLocal(step.goal_id);
                    const meta = goal ? CATEGORY_META[goal.category] : undefined;
                    return (
                      <StepCard
                        key={step.id}
                        title={step.title ?? 'Untitled content'}
                        type={(step.source_type as ContentType) ?? 'article'}
                        meta={step.difficulty ?? ''}
                        goalName={meta?.label}
                        goalAccent={meta?.accent}
                        completed
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-center" style={{ color: '#DC2626' }}>
          {error}
        </p>
      )}
    </div>
  );
}
