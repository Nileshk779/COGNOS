import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Video, Flag, Bell, Plus, X } from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { accents, colors } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { decodeHtmlEntities } from '@/lib/utils';
import type { CalendarEntry, TeacherInfo } from '@/lib/types';
import EmptyState from '@/components/dashboard/EmptyState';
import { SkeletonBlock } from '@/components/dashboard/CardSkeleton';

const typeIcons: Record<CalendarEntry['type'], React.ElementType> = {
  session: Video,
  deadline: Flag,
  event: Bell,
};

const typeAccent: Record<CalendarEntry['type'], keyof typeof accents> = {
  session: 'blue',
  deadline: 'amber',
  event: 'purple',
};

export default function CalendarPage() {
  const { userId } = useApp();
  const today = useMemo(() => new Date(), []);
  const [entries, setEntries] = useState<CalendarEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftTime, setDraftTime] = useState('18:00');
  const [draftGoalId, setDraftGoalId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    apiFetch<CalendarEntry[]>(`/calendar/${userId}`)
      .then(setEntries)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load calendar'));
    apiFetch<TeacherInfo[]>(`/teachers/${userId}`)
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, [userId]);

  const submitEvent = async () => {
    if (!draftTitle.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const [hours, minutes] = draftTime.split(':').map(Number);
      const eventDate = new Date(selectedDay);
      eventDate.setHours(hours || 0, minutes || 0, 0, 0);

      const created = await apiFetch<{ id: string; title: string; event_date: string; goal_id: string | null }>('/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: draftTitle.trim(),
          event_date: eventDate.toISOString(),
          goal_id: draftGoalId || undefined,
        }),
      });
      setEntries((prev) => [
        ...(prev ?? []),
        { id: created.id, type: 'event', title: created.title, date: created.event_date, goal_id: created.goal_id },
      ]);
      setDraftTitle('');
      setDraftGoalId('');
      setAddOpen(false);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Could not save — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const datedEntries = useMemo(
    () => (entries ?? []).filter((e) => e.date).map((e) => ({ ...e, dateObj: new Date(e.date as string) })),
    [entries]
  );

  const eventsFor = (day: Date) => datedEntries.filter((e) => isSameDay(e.dateObj, day));

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const agenda = eventsFor(selectedDay).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #06B6D4, #10B981)' }}>
          <CalendarDays className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-display" style={{ color: colors.textMain }}>
            Calendar
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Completed sessions & upcoming opportunity deadlines
          </p>
        </div>
      </div>

      {entries === null ? (
        <SkeletonBlock className="h-96" />
      ) : error ? (
        <p className="text-xs text-center" style={{ color: '#DC2626' }}>
          {error}
        </p>
      ) : (
        <div className="rounded-3xl border-2 bg-white overflow-hidden" style={{ borderColor: colors.border }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.border }}>
            <div className="flex items-center gap-1">
              <button onClick={() => setCursor((c) => subMonths(c, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4" style={{ color: colors.textSecondary }} />
              </button>
              <span className="text-sm font-semibold px-2 min-w-[9rem] text-center" style={{ color: colors.textMain }}>
                {format(cursor, 'MMMM yyyy')}
              </span>
              <button onClick={() => setCursor((c) => addMonths(c, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4" style={{ color: colors.textSecondary }} />
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_280px]">
            <div className="p-5">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-wide py-1" style={{ color: colors.textSecondary }}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const dayEvents = eventsFor(day);
                  const isToday = isSameDay(day, today);
                  const isSelected = isSameDay(day, selectedDay);
                  const inMonth = isSameMonth(day, cursor);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className="relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                      style={{
                        backgroundColor: isSelected ? colors.primary : isToday ? '#EFF6FF' : 'transparent',
                        opacity: inMonth ? 1 : 0.35,
                      }}
                    >
                      <span className="text-xs font-medium" style={{ color: isSelected ? '#FFFFFF' : isToday ? colors.primary : colors.textMain }}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5">
                          {dayEvents.slice(0, 3).map((ev, i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isSelected ? '#FFFFFF' : accents[typeAccent[ev.type]].color }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border-t sm:border-t-0 sm:border-l" style={{ borderColor: colors.border }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  {format(selectedDay, 'EEEE, MMM d')}
                </p>
                <motion.button
                  onClick={() => {
                    setAddOpen((v) => !v);
                    setSaveError(null);
                  }}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: addOpen ? '#FEE2E2' : '#EFF6FF', color: addOpen ? '#DC2626' : colors.primary }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {addOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {addOpen ? 'Cancel' : 'Add'}
                </motion.button>
              </div>

              <AnimatePresence>
                {addOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                    <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: colors.border, backgroundColor: '#F8FAFC' }}>
                      <input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        placeholder="What's happening?"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                        style={{ borderColor: colors.border, color: colors.textMain, backgroundColor: colors.card }}
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="time"
                          value={draftTime}
                          onChange={(e) => setDraftTime(e.target.value)}
                          className="w-1/2 px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                          style={{ borderColor: colors.border, color: colors.textMain, backgroundColor: colors.card }}
                        />
                        <select
                          value={draftGoalId}
                          onChange={(e) => setDraftGoalId(e.target.value)}
                          className="w-1/2 px-2 py-1.5 rounded-lg text-xs border outline-none"
                          style={{ borderColor: colors.border, color: colors.textMain, backgroundColor: colors.card }}
                        >
                          <option value="">No goal</option>
                          {teachers.map((t) => (
                            <option key={t.goal_id} value={t.goal_id}>
                              {t.goal_title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <motion.button
                        onClick={submitEvent}
                        disabled={!draftTitle.trim() || saving}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: colors.primary }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {saving ? 'Adding...' : `Add to ${format(selectedDay, 'MMM d')}`}
                      </motion.button>
                      {saveError && (
                        <p className="text-[10px] font-medium text-center" style={{ color: '#DC2626' }}>
                          {saveError}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {agenda.length === 0 ? (
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Nothing here.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {agenda.map((ev, idx) => {
                    const accent = accents[typeAccent[ev.type]];
                    const Icon = typeIcons[ev.type];
                    return (
                      <motion.div
                        key={idx}
                        className="rounded-xl p-3 border"
                        style={{ borderColor: colors.border }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent.bg, color: accent.color }}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: accent.color }}>
                            {format(ev.dateObj, 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-snug" style={{ color: colors.textMain }}>
                          {decodeHtmlEntities(ev.title)}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {entries !== null && entries.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled yet"
          description="Completed sessions and opportunity deadlines will show up here once you have some."
        />
      )}
    </div>
  );
}
