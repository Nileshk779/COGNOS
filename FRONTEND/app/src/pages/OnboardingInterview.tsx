import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, CheckCircle2 } from 'lucide-react';
import { colors, accents } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';
import { CognosAvatar } from './Interview';
import type { OnboardingRespondResponse, OnboardingStartResponse } from '@/lib/types';

type LocalTurn = { role: 'interviewer' | 'candidate'; content: string };
type Phase = 'loading' | 'live' | 'done' | 'error';

export default function OnboardingInterview() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<LocalTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [turnNumber, setTurnNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(8);
  const [loadingNext, setLoadingNext] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { listening, supported, toggle } = useSpeechRecognition((text) =>
    setDraft((d) => (d ? `${d} ${text}` : text))
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.replace('/login');
      return;
    }

    apiFetch<OnboardingStartResponse>('/onboarding/interview/start', { method: 'POST' })
      .then((res) => {
        setSessionId(res.session_id);
        setCurrentQuestion(res.question);
        setTotalQuestions(res.total_questions);
        setPhase('live');
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Couldn't start onboarding. Try refreshing.");
        setPhase('error');
      });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [turns, currentQuestion, loadingNext]);

  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => window.location.replace('/dashboard'), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  const submit = async () => {
    if (!draft.trim() || loadingNext || !sessionId) return;
    const text = draft.trim();
    setTurns((prev) => [...prev, { role: 'interviewer', content: currentQuestion }, { role: 'candidate', content: text }]);
    setDraft('');
    setCurrentQuestion('');
    setLoadingNext(true);
    try {
      const res = await apiFetch<OnboardingRespondResponse>(`/onboarding/interview/${sessionId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      setTurnNumber(res.turn_number);
      setTotalQuestions(res.total_questions);
      if (res.done) {
        setPhase('done');
      } else if (res.question) {
        setCurrentQuestion(res.question);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'COGNOS lost connection — try sending that again.');
      setCurrentQuestion(turns.length ? turns[turns.length - 2]?.content ?? '' : currentQuestion);
    } finally {
      setLoadingNext(false);
    }
  };

  const progressPct = Math.min(100, (turnNumber / totalQuestions) * 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
      {phase === 'live' && (
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-5 pb-1 flex-shrink-0 max-w-2xl mx-auto w-full">
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
      )}

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div key="loading" className="flex-1 flex flex-col items-center justify-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CognosAvatar thinking />
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              COGNOS is getting ready to meet you...
            </p>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div key="error" className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm" style={{ color: '#DC2626' }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: colors.primary }}
            >
              Retry
            </button>
          </motion.div>
        )}

        {phase === 'live' && (
          <motion.div key="live" className="flex-1 flex flex-col min-h-0 w-full max-w-2xl mx-auto px-4 sm:px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide py-6 space-y-4">
              {turns.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${t.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}
                >
                  {t.role === 'interviewer' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: accents.indigo.bg, color: accents.indigo.color }}>
                      C
                    </div>
                  )}
                  <div
                    className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
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
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: accents.indigo.bg, color: accents.indigo.color }}>
                    C
                  </div>
                  <div
                    className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed font-medium"
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

              {error && (
                <p className="text-xs font-medium text-center" style={{ color: '#DC2626' }}>
                  {error}
                </p>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="pb-8 pt-2 flex-shrink-0">
              <div className="flex items-end gap-2 rounded-2xl border px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Type your answer..."
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
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div key="done" className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#D1FAE5', border: '2px solid #10B981' }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: '#10B981' }} />
            </motion.div>
            <div>
              <h2 className="text-xl font-semibold font-display mb-1.5" style={{ color: colors.textMain }}>
                Onboarding complete
              </h2>
              <p className="text-sm max-w-sm" style={{ color: colors.textSecondary }}>
                COGNOS has everything it needs. Taking you to your dashboard...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
