import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Swords } from 'lucide-react';
import { accents, colors } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_META } from '@/lib/constants';
import { useApp } from '@/context/AppContext';
import type { Quest, TeacherInfo } from '@/lib/types';
import QuestCard from '@/components/dashboard/QuestCard';
import EmptyState from '@/components/dashboard/EmptyState';
import { CardSkeleton } from '@/components/dashboard/CardSkeleton';

type Filter = 'all' | string;

export default function Quests() {
  const { userId } = useApp();
  const [teachers, setTeachers] = useState<TeacherInfo[] | null>(null);
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    apiFetch<TeacherInfo[]>(`/teachers/${userId}`)
      .then(async (list) => {
        setTeachers(list);
        if (list.length === 0) {
          setQuests([]);
          return;
        }
        const perGoal = await Promise.all(
          list.map((t) => apiFetch<Quest[]>(`/quests/${t.goal_id}`).catch(() => []))
        );
        setQuests(perGoal.flat());
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load quests'));
  }, [userId]);

  const goalTitle = (goalId: string) => teachers?.find((t) => t.goal_id === goalId)?.goal_title ?? 'Goal';
  const goalAccent = (goalId: string) => CATEGORY_META[teachers?.find((t) => t.goal_id === goalId)?.category ?? 'english_speaking']?.accent ?? 'blue';

  const filtered = useMemo(
    () => (quests ? (filter === 'all' ? quests : quests.filter((q) => q.goal_id === filter)) : []),
    [quests, filter]
  );

  const totalXp = (quests ?? []).filter((q) => q.status === 'completed').reduce((sum, q) => sum + q.xp_value, 0);
  const completedCount = (quests ?? []).filter((q) => q.status === 'completed').length;

  const completeQuest = async (questId: string) => {
    setCompletingId(questId);
    try {
      const updated = await apiFetch<Quest>(`/quests/complete/${questId}`, { method: 'PATCH' });
      setQuests((prev) => (prev ? prev.map((q) => (q.id === questId ? updated : q)) : prev));
    } catch {
      // stays in its current status; a retry affordance can come later
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-display" style={{ color: colors.textMain }}>
            Side Quests
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            Small challenges, tied to your goals — beat your own record, not the leaderboard.
          </p>
        </div>

        <motion.div
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 flex-shrink-0"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
            <Trophy className="w-4.5 h-4.5" style={{ color: '#B45309' }} />
          </div>
          <div>
            <p className="text-sm font-bold leading-none flex items-center gap-1" style={{ color: colors.textMain }}>
              <Zap className="w-3.5 h-3.5" style={{ color: '#B45309' }} fill="#B45309" />
              {totalXp} XP
            </p>
            <p className="text-[11px] mt-1" style={{ color: colors.textSecondary }}>
              {completedCount} of {quests?.length ?? 0} completed
            </p>
          </div>
        </motion.div>
      </div>

      {teachers && teachers.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors border"
            style={
              filter === 'all'
                ? { backgroundColor: colors.textMain, borderColor: colors.textMain, color: '#FFFFFF' }
                : { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }
            }
          >
            All Quests
          </button>
          {teachers.map((t) => {
            const isActive = filter === t.goal_id;
            const accent = accents[CATEGORY_META[t.category]?.accent ?? 'blue'];
            return (
              <button
                key={t.goal_id}
                onClick={() => setFilter(t.goal_id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors border"
                style={
                  isActive
                    ? { backgroundColor: accent.color, borderColor: accent.color, color: '#FFFFFF' }
                    : { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }
                }
              >
                {t.goal_title}
              </button>
            );
          })}
        </div>
      )}

      {quests === null ? (
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
        <EmptyState icon={Swords} title="No quests yet" description="Once your teacher assigns quests for a goal, they'll show up here." />
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((quest, idx) => (
            <motion.div
              key={quest.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
            >
              <QuestCard
                quest={quest}
                goalTitle={goalTitle(quest.goal_id)}
                accent={goalAccent(quest.goal_id)}
                onComplete={() => completeQuest(quest.id)}
                completing={completingId === quest.id}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
