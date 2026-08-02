import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Check, Flame, Zap, Target, Sparkles, Mail } from 'lucide-react';
import { accents, colors } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import { CATEGORY_META } from '@/lib/constants';
import { useApp } from '@/context/AppContext';
import type { Blueprint, GoalSummary, Quest, TeacherInfo } from '@/lib/types';
import { SkeletonBlock } from '@/components/dashboard/CardSkeleton';

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-3.5 h-3.5" style={{ color: colors.primary }} />
      <h5 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: colors.textSecondary }}>
        {label}
      </h5>
      <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
    </div>
  );
}

interface UserType {
  id: string;
  name: string;
  email: string;
}

export default function ProfilePage() {
  const { userId } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [teachers, setTeachers] = useState<TeacherInfo[] | null>(null);
  const [summary, setSummary] = useState<GoalSummary[] | null>(null);
  const [totalXp, setTotalXp] = useState<number | null>(null);
  const [blueprints, setBlueprints] = useState<Record<string, Blueprint | null>>({});

  useEffect(() => {
    if (!userId) return;

    apiFetch<UserType>('/me').then((u) => {
      setName(u.name);
      setEmail(u.email);
    });

    apiFetch<TeacherInfo[]>(`/teachers/${userId}`)
      .then(async (list) => {
        setTeachers(list);

        const questLists = await Promise.all(list.map((t) => apiFetch<Quest[]>(`/quests/${t.goal_id}`).catch(() => [])));
        const xp = questLists.flat().filter((q) => q.status === 'completed').reduce((sum, q) => sum + q.xp_value, 0);
        setTotalXp(xp);

        const bps = await Promise.all(
          list.map((t) =>
            apiFetch<Blueprint | null>(`/growth/${t.goal_id}/blueprint`)
              .then((bp) => [t.goal_id, bp] as const)
              .catch(() => [t.goal_id, null] as const)
          )
        );
        setBlueprints(Object.fromEntries(bps));
      })
      .catch(() => setTeachers([]));

    apiFetch<GoalSummary[]>(`/home/summary/${userId}`)
      .then(setSummary)
      .catch(() => setSummary([]));
  }, [userId]);

  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const combinedStreak = summary?.reduce((sum, g) => sum + g.streak_days, 0) ?? 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      {/* HEADER BANNER */}
      <div className="relative z-0 px-6 sm:px-8 pt-10 pb-24 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}>
        <div className="absolute inset-0 dot-grid-light opacity-[0.3] pointer-events-none" />
        <motion.div
          className="absolute -top-12 -right-12 w-56 h-56 rounded-full opacity-30 blur-2xl"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative max-w-3xl mx-auto">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">Account</span>
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-8 pb-10 -mt-16">
        {/* AVATAR + IDENTITY */}
        <motion.div className="flex items-end gap-4 mb-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.3 }}>
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 border-[5px]"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderColor: colors.bg, boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}
          >
            {initials}
          </div>
          <div className="pb-1.5 min-w-0 flex-1">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-semibold font-display bg-transparent border-b outline-none w-full"
                style={{ color: colors.textMain, borderColor: colors.primary }}
                autoFocus
              />
            ) : (
              <h4 className="text-lg font-semibold font-display truncate" style={{ color: colors.textMain }}>
                {name}
              </h4>
            )}
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              Learner
            </p>
          </div>
          <motion.button
            onClick={() => setEditing((e) => !e)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: editing ? '#DCFCE7' : '#EFF6FF', color: editing ? '#16A34A' : colors.primary }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {editing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editing ? 'Done' : 'Edit'}
          </motion.button>
        </motion.div>

        <motion.div className="flex items-center gap-1.5 mt-3 mb-8 pl-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14, duration: 0.3 }}>
          <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.textSecondary }} />
          {editing ? (
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: '#F8FAFC', borderColor: colors.border, color: colors.textMain }}
            />
          ) : (
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              {email}
            </span>
          )}
        </motion.div>

        {/* STATS */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
          <SectionLabel icon={Zap} label="This month" />
          {summary === null || totalXp === null ? (
            <div className="grid grid-cols-3 gap-3 mb-9">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-9">
              {[
                { icon: Flame, label: 'Combined streak', value: `${combinedStreak}d`, accent: accents.amber },
                { icon: Zap, label: 'Total XP', value: totalXp, accent: accents.pink },
                { icon: Target, label: 'Active goals', value: teachers?.length ?? 0, accent: accents.blue },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#F8FAFC' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5" style={{ backgroundColor: s.accent.bg }}>
                    <s.icon className="w-4 h-4" style={{ color: s.accent.color }} />
                  </div>
                  <p className="text-lg font-bold font-display" style={{ color: colors.textMain }}>
                    {s.value}
                  </p>
                  <p className="text-[10px] mt-1 leading-tight" style={{ color: colors.textSecondary }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* BLUEPRINT SNAPSHOT */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.3 }}>
          <SectionLabel icon={Sparkles} label="Your Blueprint" />
          {teachers === null ? (
            <SkeletonBlock className="h-20" />
          ) : teachers.length === 0 ? (
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              No goals yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {teachers.map((t, idx) => {
                const meta = CATEGORY_META[t.category];
                const accent = accents[meta?.accent ?? 'blue'];
                const bp = blueprints[t.goal_id];
                return (
                  <motion.div
                    key={t.goal_id}
                    className="relative rounded-2xl pl-4 pr-4 py-3.5 overflow-hidden"
                    style={{ backgroundColor: '#F8FAFC' }}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28 + idx * 0.05, duration: 0.25 }}
                  >
                    <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent.color }} />
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: colors.textMain }}>
                        {t.goal_title}
                      </span>
                      {bp?.current_level && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: accent.bg, color: accent.color }}>
                          {bp.current_level}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: colors.textSecondary }}>
                      {bp?.learning_style || 'No blueprint set yet for this goal.'}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
