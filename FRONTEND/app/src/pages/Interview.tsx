import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Clock,
  TrendingUp,
  RotateCcw,
  History,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { accents, colors, type AccentKey } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_META } from '@/lib/constants';
import { useApp } from '@/context/AppContext';
import { decodeHtmlEntities } from '@/lib/utils';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';
import type {
  InterviewRespondResponse,
  InterviewSession,
  InterviewStartResponse,
  TeacherInfo,
} from '@/lib/types';
import { SkeletonBlock } from '@/components/dashboard/CardSkeleton';

type LocalTurn = { role: 'interviewer' | 'candidate'; content: string };

const SUGGESTED_TOPICS = [
  'Frontend Developer (React)',
  'Backend Engineer (Python)',
  'Product Manager',
  'Data Scientist',
];

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.floor((now - startedAt) / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <span className="flex items-center gap-1 text-xs font-medium tabular-nums" style={{ color: colors.textSecondary }}>
      <Clock className="w-3.5 h-3.5" />
      {mm}:{ss}
    </span>
  );
}

export function CognosAvatar({ thinking }: { thinking: boolean }) {
  return (
    <div className="relative w-11 h-11 flex-shrink-0">
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
        animate={thinking ? { scale: [1, 1.12, 1], rotate: [0, 4, -4, 0] } : { scale: 1 }}
        transition={{ duration: 1.4, repeat: thinking ? Infinity : 0, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 rounded-2xl flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      {thinking && (
        <motion.div
          className="absolute -inset-1.5 rounded-2xl border-2"
          style={{ borderColor: '#A78BFA' }}
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const circumference = 2 * Math.PI * 42;
  const color = score >= 8 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke={colors.border} strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-display" style={{ color: colors.textMain }}>
          {score}
        </span>
        <span className="text-[10px] font-medium" style={{ color: colors.textSecondary }}>
          / 10
        </span>
      </div>
    </div>
  );
}

function SetupScreen({
  onStart,
  starting,
  error,
  history,
  onResume,
}: {
  onStart: (topic: string, goalId?: string) => void;
  starting: boolean;
  error: string | null;
  history: InterviewSession[] | null;
  onResume: (s: InterviewSession) => void;
}) {
  const { userId } = useApp();
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [topic, setTopic] = useState('');

  useEffect(() => {
    if (!userId) return;
    apiFetch<TeacherInfo[]>(`/teachers/${userId}`)
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, [userId]);

  const completed = (history ?? []).filter((h) => h.status === 'completed');

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      <div
        className="relative z-0 px-6 sm:px-8 pt-14 pb-20 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}
      >
        <div className="absolute inset-0 dot-grid-light opacity-[0.25] pointer-events-none" />
        <motion.div
          className="absolute -top-16 -right-10 w-64 h-64 rounded-full opacity-30 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <motion.div
            className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)', boxShadow: '0 12px 32px rgba(99,102,241,0.4)' }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-semibold font-display text-white">Mock Interview with COGNOS</h1>
          <p className="text-sm text-white/60 mt-1.5">
            A live, adaptive AI interviewer. Real questions, real follow-ups, real feedback.
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 sm:px-8 pb-12 -mt-10">
        <motion.div
          className="rounded-3xl border-2 bg-white p-6"
          style={{ borderColor: colors.border }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textSecondary }}>
            What's this interview for?
          </p>

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Senior React Developer, IELTS Speaking, ML Engineer..."
            className="w-full px-4 py-3 rounded-2xl text-sm border-2 outline-none mb-3"
            style={{ borderColor: colors.border, color: colors.textMain }}
            onFocus={(e) => (e.currentTarget.style.borderColor = colors.primary)}
            onBlur={(e) => (e.currentTarget.style.borderColor = colors.border)}
          />

          <div className="flex flex-wrap gap-1.5 mb-2">
            {teachers.map((t) => {
              const meta = CATEGORY_META[t.category];
              return (
                <button
                  key={t.goal_id}
                  onClick={() => setTopic(t.goal_title)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors"
                  style={{ backgroundColor: accents[meta?.accent ?? 'blue'].bg, color: accents[meta?.accent ?? 'blue'].color }}
                >
                  {t.goal_title}
                </button>
              );
            })}
            {SUGGESTED_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors"
                style={{ backgroundColor: '#F1F5F9', color: colors.textSecondary }}
              >
                {t}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-xs font-medium mb-2" style={{ color: '#DC2626' }}>
              {error}
            </p>
          )}

          <motion.button
            onClick={() => topic.trim() && onStart(topic.trim())}
            disabled={!topic.trim() || starting}
            className="w-full mt-2 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
            whileHover={!starting ? { scale: 1.01 } : undefined}
            whileTap={!starting ? { scale: 0.98 } : undefined}
          >
            {starting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Preparing your interview...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Start Interview
              </>
            )}
          </motion.button>
        </motion.div>

        {history === null ? (
          <div className="mt-6 space-y-2">
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
          </div>
        ) : completed.length > 0 ? (
          <motion.div className="mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                Past interviews
              </p>
            </div>
            <div className="space-y-2">
              {completed.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onResume(s)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border bg-white text-left hover:shadow-sm transition-shadow"
                  style={{ borderColor: colors.border }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: (s.score ?? 0) >= 8 ? '#D1FAE5' : (s.score ?? 0) >= 5 ? '#FEF3C7' : '#FEE2E2',
                      color: (s.score ?? 0) >= 8 ? '#059669' : (s.score ?? 0) >= 5 ? '#D97706' : '#DC2626',
                    }}
                  >
                    {s.score ?? '–'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: colors.textMain }}>
                      {s.topic}
                    </p>
                    <p className="text-[11px]" style={{ color: colors.textSecondary }}>
                      {s.completed_at ? new Date(s.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: colors.textSecondary }} />
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function LiveInterview({
  topic,
  turns,
  currentQuestion,
  turnNumber,
  totalQuestions,
  loadingNext,
  onSubmit,
  submitError,
  startedAt,
}: {
  topic: string;
  turns: LocalTurn[];
  currentQuestion: string;
  turnNumber: number;
  totalQuestions: number;
  loadingNext: boolean;
  onSubmit: (text: string) => void;
  submitError: string | null;
  startedAt: number;
}) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { listening, supported, toggle } = useSpeechRecognition((text) =>
    setDraft((d) => (d ? `${d} ${text}` : text))
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [turns, currentQuestion, loadingNext]);

  const submit = () => {
    if (!draft.trim() || loadingNext) return;
    onSubmit(draft.trim());
    setDraft('');
  };

  const progressPct = Math.min(100, (turnNumber / totalQuestions) * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <CognosAvatar thinking={loadingNext} />
            <div>
              <h3 className="text-sm font-semibold" style={{ color: colors.textMain }}>
                COGNOS
              </h3>
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                {decodeHtmlEntities(topic)}
              </p>
            </div>
          </div>
          <ElapsedTimer startedAt={startedAt} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #6366F1, #EC4899)' }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: colors.textSecondary }}>
            {Math.min(turnNumber + 1, totalQuestions)}/{totalQuestions}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-hide" style={{ backgroundColor: '#F8FAFC' }}>
        {turns.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-end gap-2 ${t.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}
          >
            {t.role === 'interviewer' && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ backgroundColor: accents.indigo.bg, color: accents.indigo.color }}
              >
                S
              </div>
            )}
            <div
              className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
              style={
                t.role === 'interviewer'
                  ? { backgroundColor: colors.card, color: colors.textMain, border: `1px solid ${colors.border}`, borderBottomLeftRadius: 6 }
                  : { backgroundColor: colors.primary, color: '#FFFFFF', borderBottomRightRadius: 6 }
              }
            >
              {t.content}
            </div>
          </motion.div>
        ))}

        {currentQuestion && (
          <motion.div
            key={`q-${turnNumber}`}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex items-end gap-2 justify-start"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ backgroundColor: accents.indigo.bg, color: accents.indigo.color }}
            >
              S
            </div>
            <div
              className="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed font-medium"
              style={{ backgroundColor: '#EEF2FF', color: colors.textMain, border: `1.5px solid ${accents.indigo.color}40`, borderBottomLeftRadius: 6 }}
            >
              {currentQuestion}
            </div>
          </motion.div>
        )}

        {loadingNext && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pl-10">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: accents.indigo.color }}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: colors.textSecondary }}>
              COGNOS is thinking...
            </span>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
        {submitError && (
          <p className="text-[11px] font-medium mb-2 px-1" style={{ color: '#DC2626' }}>
            {submitError}
          </p>
        )}
        <div className="flex items-end gap-2 rounded-2xl border px-4 py-2.5" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Type your answer... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 text-sm outline-none bg-transparent resize-none max-h-32"
            style={{ color: colors.textMain }}
            disabled={loadingNext}
          />
          {supported && (
            <motion.button
              onClick={toggle}
              className="p-2 rounded-xl flex-shrink-0"
              style={{ backgroundColor: listening ? '#FEE2E2' : '#F1F5F9', color: listening ? '#DC2626' : colors.textSecondary }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={listening ? 'Stop recording' : 'Answer by voice'}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </motion.button>
          )}
          <motion.button
            onClick={submit}
            disabled={loadingNext || !draft.trim()}
            className="p-2.5 rounded-xl flex-shrink-0 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
            whileHover={!loadingNext ? { scale: 1.05 } : undefined}
            whileTap={!loadingNext ? { scale: 0.95 } : undefined}
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function ResultsScreen({ session, onRestart }: { session: InterviewSession; onRestart: () => void }) {
  const accent: AccentKey = (session.score ?? 0) >= 8 ? 'emerald' : (session.score ?? 0) >= 5 ? 'amber' : 'pink';
  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      <div className="max-w-2xl mx-auto px-6 sm:px-8 py-10">
        <motion.div
          className="rounded-3xl border-2 p-8 text-center"
          style={{ borderColor: accents[accent].color + '50', backgroundColor: accents[accent].bg + '30' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSecondary }}>
            Interview complete
          </p>
          <h2 className="text-lg font-semibold font-display mb-6" style={{ color: colors.textMain }}>
            {decodeHtmlEntities(session.topic)}
          </h2>

          <div className="flex justify-center mb-6">
            <ScoreRing score={session.score ?? 0} />
          </div>

          <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: colors.textMain }}>
            {session.summary}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <motion.div
            className="rounded-2xl border p-5"
            style={{ borderColor: colors.border }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" style={{ color: accents.emerald.color }} />
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                Strengths
              </h4>
            </div>
            <ul className="space-y-2">
              {(session.strengths ?? []).map((s, i) => (
                <li key={i} className="text-sm leading-snug flex gap-2" style={{ color: colors.textMain }}>
                  <span style={{ color: accents.emerald.color }}>•</span> {s}
                </li>
              ))}
              {(session.strengths ?? []).length === 0 && (
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Nothing flagged.
                </p>
              )}
            </ul>
          </motion.div>

          <motion.div
            className="rounded-2xl border p-5"
            style={{ borderColor: colors.border }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" style={{ color: accents.amber.color }} />
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                To improve
              </h4>
            </div>
            <ul className="space-y-2">
              {(session.improvements ?? []).map((s, i) => (
                <li key={i} className="text-sm leading-snug flex gap-2" style={{ color: colors.textMain }}>
                  <span style={{ color: accents.amber.color }}>•</span> {s}
                </li>
              ))}
              {(session.improvements ?? []).length === 0 && (
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Nothing flagged.
                </p>
              )}
            </ul>
          </motion.div>
        </div>

        <motion.button
          onClick={onRestart}
          className="w-full mt-8 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-4 h-4" /> Start Another Interview
        </motion.button>
      </div>
    </div>
  );
}

export default function Interview() {
  const { userId } = useApp();
  const [phase, setPhase] = useState<'setup' | 'live' | 'results'>('setup');
  const [history, setHistory] = useState<InterviewSession[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [topic, setTopic] = useState('');
  const [turns, setTurns] = useState<LocalTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [turnNumber, setTurnNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [startedAt, setStartedAt] = useState(Date.now());

  const loadHistory = () => {
    if (!userId) return;
    apiFetch<InterviewSession[]>(`/interview/history/${userId}`)
      .then(setHistory)
      .catch(() => setHistory([]));
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const startInterview = async (topicText: string, goalId?: string) => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await apiFetch<InterviewStartResponse>('/interview/start', {
        method: 'POST',
        body: JSON.stringify({ topic: topicText, goal_id: goalId }),
      });
      setSession(res.session);
      setTopic(res.session.topic);
      setTurns([]);
      setCurrentQuestion(res.first_question);
      setTurnNumber(0);
      setTotalQuestions(6);
      setStartedAt(Date.now());
      setPhase('live');
    } catch (e) {
      setStartError(e instanceof ApiError ? e.message : 'Could not start the interview. Try again.');
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async (text: string) => {
    if (!session) return;
    setSubmitError(null);
    setTurns((prev) => [...prev, { role: 'interviewer', content: currentQuestion }, { role: 'candidate', content: text }]);
    setCurrentQuestion('');
    setLoadingNext(true);
    try {
      const res = await apiFetch<InterviewRespondResponse>(`/interview/${session.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      setTurnNumber(res.turn_number);
      setTotalQuestions(res.total_questions);
      if (res.done && res.session) {
        setSession(res.session);
        setPhase('results');
        loadHistory();
      } else if (res.question) {
        setCurrentQuestion(res.question);
      }
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "COGNOS didn't respond — try sending that again.");
      setCurrentQuestion(text ? turns[turns.length - 1]?.content ?? '' : '');
    } finally {
      setLoadingNext(false);
    }
  };

  const resumeCompleted = (s: InterviewSession) => {
    setSession(s);
    setPhase('results');
  };

  const reset = () => {
    setSession(null);
    setTurns([]);
    setCurrentQuestion('');
    setTurnNumber(0);
    setStartError(null);
    setSubmitError(null);
    setPhase('setup');
  };

  return (
    <AnimatePresence mode="wait">
      {phase === 'setup' && (
        <motion.div key="setup" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SetupScreen onStart={startInterview} starting={starting} error={startError} history={history} onResume={resumeCompleted} />
        </motion.div>
      )}
      {phase === 'live' && session && (
        <motion.div key="live" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LiveInterview
            topic={topic}
            turns={turns}
            currentQuestion={currentQuestion}
            turnNumber={turnNumber}
            totalQuestions={totalQuestions}
            loadingNext={loadingNext}
            onSubmit={submitAnswer}
            submitError={submitError}
            startedAt={startedAt}
          />
        </motion.div>
      )}
      {phase === 'results' && session && (
        <motion.div key="results" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ResultsScreen session={session} onRestart={reset} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
