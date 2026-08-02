import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Route, X, Send, Check, Circle, GraduationCap, ExternalLink, ClipboardCheck, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { accents, colors, contentTypeMeta, difficultyMeta, type ContentType, type Difficulty } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_META, type GoalCategory } from '@/lib/constants';
import { decodeHtmlEntities } from '@/lib/utils';
import type { ChatExchange, ChatMessage, Goal, PathItemWithContent, TeacherInfo } from '@/lib/types';
import ChatBubble from '@/components/dashboard/ChatBubble';
import EmptyState from '@/components/dashboard/EmptyState';
import { CardSkeleton, SkeletonBlock } from '@/components/dashboard/CardSkeleton';

function formatMsgTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`;
}

function TaskMessageCard({ msg, accent, teacherName }: { msg: ChatMessage; accent: keyof typeof accents; teacherName: string }) {
  const a = accents[accent];
  const hasLink = !!msg.task_url;
  const Wrapper = hasLink ? motion.button : motion.div;
  return (
    <Wrapper
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={hasLink ? () => window.open(msg.task_url!, '_blank', 'noopener,noreferrer') : undefined}
      className="flex items-start gap-3 max-w-[80%] p-3.5 rounded-2xl border-2 text-left"
      style={{ borderColor: a.color, backgroundColor: a.bg }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFFFFF' }}>
        <ClipboardCheck className="w-4 h-4" style={{ color: a.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: a.color }}>
            {teacherName} assigned a task
          </span>
          {msg.created_at && (
            <span className="text-[10px] font-medium" style={{ color: colors.textSecondary }}>
              · {formatMsgTime(msg.created_at)}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold mt-0.5 leading-snug" style={{ color: colors.textMain }}>
          {decodeHtmlEntities(msg.task_title ?? 'Task')}
        </p>
        {msg.task_description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: colors.textMain, opacity: 0.75 }}>
            {decodeHtmlEntities(msg.task_description)}
          </p>
        )}
        {hasLink && (
          <span className="flex items-center gap-1 text-[10px] font-medium mt-1.5" style={{ color: a.color }}>
            Open <ExternalLink className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
    </Wrapper>
  );
}

const avatarGradients: Record<string, string> = {
  english_speaking: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
  fitness: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
  ai_ml: 'linear-gradient(135deg, #6366F1, #A78BFA)',
};

function NewGoalForm({ onCreated }: { onCreated: (goal: Goal) => void }) {
  const categories = Object.keys(CATEGORY_META) as GoalCategory[];
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<GoalCategory>(categories[0]);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const goal = await apiFetch<Goal>('/goals', {
        method: 'POST',
        body: JSON.stringify({ category, title: title.trim() }),
      });
      onCreated(goal);
      setTitle('');
      setOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create goal — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6">
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
        style={{ backgroundColor: open ? '#FEE2E2' : '#EFF6FF', color: open ? '#DC2626' : colors.primary }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {open ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        {open ? 'Cancel' : 'New Goal'}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-2xl border-2 p-4 space-y-2.5" style={{ borderColor: colors.border, backgroundColor: '#F8FAFC' }}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: colors.border, color: colors.textMain, backgroundColor: colors.card }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's the goal? e.g. Confident client calls in English"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: colors.border, color: colors.textMain, backgroundColor: colors.card }}
              />
              {error && (
                <p className="text-xs font-medium" style={{ color: '#DC2626' }}>
                  {error}
                </p>
              )}
              <motion.button
                onClick={submit}
                disabled={!title.trim() || saving}
                className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: colors.primary }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {saving ? 'Creating...' : 'Start this goal'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherList({
  teachers,
  loading,
  error,
  onSelect,
  onGoalCreated,
}: {
  teachers: TeacherInfo[] | null;
  loading: boolean;
  error: string | null;
  onSelect: (t: TeacherInfo) => void;
  onGoalCreated: (goal: Goal) => void;
}) {
  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold tracking-tight mb-1 font-display" style={{ color: colors.textMain }}>
        My Teachers
      </h1>
      <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
        A specialized AI coach for every goal you're chasing.
      </p>

      <NewGoalForm onCreated={onGoalCreated} />

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <p className="text-xs" style={{ color: '#DC2626' }}>
          {error}
        </p>
      ) : !teachers || teachers.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No teachers yet" description="Once you start a goal, your coach will show up here." />
      ) : (
        <div className="space-y-3">
          {teachers.map((t, idx) => {
            const meta = CATEGORY_META[t.category];
            const accent = accents[meta?.accent ?? 'blue'];
            return (
              <motion.button
                key={t.goal_id}
                onClick={() => onSelect(t)}
                className="relative w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-white text-left transition-all overflow-hidden"
                style={{ borderColor: colors.border }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.25 }}
                whileHover={{ y: -4, borderColor: accent.color, boxShadow: `0 16px 32px ${accent.bg}90` }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-md flex-shrink-0"
                  style={{ background: avatarGradients[t.category] }}
                >
                  {t.teacher_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold" style={{ color: colors.textMain }}>
                      {t.teacher_name}
                    </h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: accent.bg, color: accent.color }}>
                      {meta?.label}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                    {meta?.teacherTitle}
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    {t.goal_title}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: colors.textSecondary }} />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PathPanel({ teacher, onClose }: { teacher: TeacherInfo; onClose: () => void }) {
  const accent = accents[CATEGORY_META[teacher.category]?.accent ?? 'blue'];
  const [path, setPath] = useState<PathItemWithContent[] | null>(null);

  useEffect(() => {
    apiFetch<PathItemWithContent[]>(`/teachers/${teacher.goal_id}/path`)
      .then(setPath)
      .catch(() => setPath([]));
  }, [teacher.goal_id]);

  const statusVisual = (status: PathItemWithContent['status']) =>
    status === 'done' ? 'done' : status === 'active' ? 'current' : 'upcoming';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/30 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textSecondary }}>
              My Path
            </p>
            <h3 className="text-base font-semibold mt-0.5" style={{ color: colors.textMain }}>
              {teacher.goal_title}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" style={{ color: colors.textSecondary }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {path === null ? (
            <div className="space-y-4">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
          ) : path.length === 0 ? (
            <EmptyState icon={Route} title="No path yet" description="Your teacher hasn't built out a learning path for this goal yet." />
          ) : (
            <div className="relative pl-8">
              <div className="absolute left-[13px] top-2 bottom-2 w-0.5" style={{ backgroundColor: colors.border }} />

              {path.map((step, i) => {
                const status = statusVisual(step.status);
                const diff = difficultyMeta[(step.difficulty as Difficulty) ?? 'medium'];
                const diffAccent = accents[diff.accent];
                const typeLabel = contentTypeMeta[(step.source_type as ContentType) ?? 'article']?.label ?? 'Content';

                return (
                  <motion.div
                    key={step.id}
                    className="relative mb-6 last:mb-0"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                  >
                    <div
                      className="absolute -left-8 top-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2"
                      style={
                        status === 'done'
                          ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                          : status === 'current'
                          ? { backgroundColor: '#FFFFFF', borderColor: accent.color }
                          : { backgroundColor: '#FFFFFF', borderColor: colors.border }
                      }
                    >
                      {status === 'done' ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : status === 'current' ? (
                        <motion.span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: accent.color }}
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                        />
                      ) : (
                        <Circle className="w-2.5 h-2.5" style={{ color: colors.textSecondary }} />
                      )}
                    </div>

                    <div
                      onClick={() => step.url && window.open(step.url, '_blank', 'noopener,noreferrer')}
                      className={`rounded-2xl border p-4 ${step.url ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                      style={
                        status === 'current'
                          ? { borderColor: accent.color, backgroundColor: accent.bg + '40' }
                          : { borderColor: colors.border, backgroundColor: status === 'upcoming' ? '#F8FAFC' : '#FFFFFF' }
                      }
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                          {typeLabel}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: diffAccent.bg, color: diffAccent.color }}>
                          {diff.label}
                        </span>
                        {step.url && <ExternalLink className="w-3 h-3 ml-auto" style={{ color: colors.textSecondary }} />}
                      </div>
                      <h4 className="text-sm font-semibold" style={{ color: colors.textMain }}>
                        {decodeHtmlEntities(step.title ?? 'Untitled content')}
                      </h4>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function TeacherChat({ teacher, onBack }: { teacher: TeacherInfo; onBack: () => void }) {
  const meta = CATEGORY_META[teacher.category];
  const accent = accents[meta?.accent ?? 'blue'];
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pathOpen, setPathOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(null);
    apiFetch<ChatMessage[]>(`/teachers/${teacher.goal_id}/chat-history`)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [teacher.goal_id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || sending) return;
    const content = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const exchange = await apiFetch<ChatExchange>(`/teachers/${teacher.goal_id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      setMessages((m) => [...(m ?? []), exchange.user_message, ...(exchange.teacher_message ? [exchange.teacher_message] : [])]);
    } catch {
      // leave draft cleared; a retry affordance can come with a future pass
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0" style={{ borderColor: colors.border }}>
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" style={{ color: colors.textSecondary }} />
        </button>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm"
          style={{ background: avatarGradients[teacher.category] }}
        >
          {teacher.teacher_name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: colors.textMain }}>
            {teacher.teacher_name}
          </h3>
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            {meta?.teacherTitle}
          </p>
        </div>
        <motion.button
          onClick={() => setPathOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
          style={{ backgroundColor: accent.bg, color: accent.color }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Route className="w-3.5 h-3.5" />
          View My Path
        </motion.button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-hide" style={{ backgroundColor: '#F8FAFC' }}>
        {messages === null ? (
          <div className="space-y-4">
            <SkeletonBlock className="h-10 w-2/3" />
            <SkeletonBlock className="h-10 w-1/2 ml-auto" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState icon={Send} title="No messages yet" description={`Say hi to ${teacher.teacher_name} to start the conversation.`} />
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <ChatBubble
                from={msg.role}
                text={msg.content}
                teacherInitials={teacher.teacher_name[0]}
                accent={meta?.accent ?? 'blue'}
                time={msg.created_at ? formatMsgTime(msg.created_at) : undefined}
              />
              {msg.task_title && (
                <div className="flex justify-start pl-10">
                  <TaskMessageCard msg={msg} accent={meta?.accent ?? 'blue'} teacherName={teacher.teacher_name} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-2 rounded-2xl border px-4 py-2" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={`Message ${teacher.teacher_name}...`}
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: colors.textMain }}
          />
          <motion.button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="p-2 rounded-xl flex-shrink-0 disabled:opacity-40"
            style={{ backgroundColor: colors.primary }}
            whileHover={!sending ? { scale: 1.05 } : undefined}
            whileTap={!sending ? { scale: 0.95 } : undefined}
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>{pathOpen && <PathPanel teacher={teacher} onClose={() => setPathOpen(false)} />}</AnimatePresence>
    </div>
  );
}

export default function Teachers() {
  const { selectedGoalId, setSelectedGoalId, userId } = useApp();
  const [teachers, setTeachers] = useState<TeacherInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<TeacherInfo | null>(null);

  useEffect(() => {
    if (!userId) return;
    apiFetch<TeacherInfo[]>(`/teachers/${userId}`)
      .then(setTeachers)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load teachers'));
  }, [userId]);

  useEffect(() => {
    if (selectedGoalId && teachers) {
      const match = teachers.find((t) => t.goal_id === selectedGoalId);
      if (match) setActive(match);
      setSelectedGoalId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers]);

  if (active) {
    return (
      <div className="h-full">
        <TeacherChat teacher={active} onBack={() => setActive(null)} />
      </div>
    );
  }

  const handleGoalCreated = (goal: Goal) => {
    setTeachers((prev) => [
      ...(prev ?? []),
      { goal_id: goal.id, category: goal.category, goal_title: goal.title, teacher_name: goal.teacher_name ?? 'Teacher' },
    ]);
  };

  return (
    <TeacherList teachers={teachers} loading={teachers === null && !error} error={error} onSelect={setActive} onGoalCreated={handleGoalCreated} />
  );
}
