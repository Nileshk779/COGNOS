import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, MessagesSquare, ArrowLeft, Smile, Paperclip, X } from 'lucide-react';
import { format } from 'date-fns';
import { accents, colors } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import type { ConversationSummary, DirectMessage, UserSearchResult } from '@/lib/types';

function initialsOf(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

// Deterministic color per person so the same name always gets the same
// avatar accent, without needing a stored color per user.
const avatarPalette: (keyof typeof accents)[] = ['blue', 'purple', 'emerald', 'amber', 'pink', 'cyan', 'indigo', 'teal'];
function accentFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % avatarPalette.length;
  return accents[avatarPalette[h]];
}

function DMBubble({ msg, isMe, accent, showTime }: { msg: DirectMessage; isMe: boolean; accent: { color: string; bg: string }; showTime: boolean }) {
  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
        style={
          isMe
            ? { backgroundColor: colors.primary, color: '#FFFFFF', borderBottomRightRadius: 6 }
            : { backgroundColor: accent.bg, color: colors.textMain, borderBottomLeftRadius: 6 }
        }
      >
        {msg.content}
      </motion.div>
      {showTime && (
        <span className="text-[10px] mt-1 px-1" style={{ color: colors.textSecondary }}>
          {format(new Date(msg.created_at), 'h:mm a')}
        </span>
      )}
    </div>
  );
}

export default function Messages() {
  const { userId, conversations, setConversations } = useApp();
  const [activeUser, setActiveUser] = useState<{ id: string; name: string } | null>(null);
  const [thread, setThread] = useState<DirectMessage[] | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[] | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    apiFetch<ConversationSummary[]>(`/messages/conversations/${userId}`)
      .then(setConversations)
      .catch(() => setConversations([]));
  }, [userId, setConversations]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      apiFetch<UserSearchResult[]>(`/messages/search?q=${encodeURIComponent(q)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!scrollRef.current || !activeUser) return;
    const switched = lastActiveIdRef.current !== activeUser.id;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: switched ? 'auto' : 'smooth' });
    lastActiveIdRef.current = activeUser.id;
  }, [activeUser?.id, thread?.length]);

  const openConversation = (id: string, name: string) => {
    setActiveUser({ id, name });
    setQuery('');
    setSearchResults(null);
    if (!userId) return;
    setThread(null);
    apiFetch<DirectMessage[]>(`/messages/thread/${userId}/${id}`)
      .then((rows) => {
        setThread(rows);
        return apiFetch(`/messages/read/${userId}/${id}`, { method: 'PATCH' });
      })
      .then(() => {
        setConversations((prev) => prev.map((c) => (c.other_user_id === id ? { ...c, unread_count: 0 } : c)));
      })
      .catch(() => setThread([]));
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const send = async () => {
    if (!draft.trim() || !activeUser || !userId) return;
    const content = draft.trim();
    setDraft('');
    requestAnimationFrame(autoGrow);

    try {
      const saved = await apiFetch<DirectMessage>('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: activeUser.id, content }),
      });
      setThread((prev) => [...(prev ?? []), saved]);
      setConversations((prev) => {
        const exists = prev.some((c) => c.other_user_id === activeUser.id);
        const updated = exists
          ? prev.map((c) =>
              c.other_user_id === activeUser.id
                ? { ...c, last_message: content, last_message_time: saved.created_at }
                : c
            )
          : [
              { other_user_id: activeUser.id, other_user_name: activeUser.name, last_message: content, last_message_time: saved.created_at, unread_count: 0 },
              ...prev,
            ];
        const idx = updated.findIndex((c) => c.other_user_id === activeUser.id);
        const [moved] = updated.splice(idx, 1);
        return [moved, ...updated];
      });
    } catch {
      // draft already cleared; nothing else to reconcile in this pass
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.other_user_name.toLowerCase().includes(q);
  });

  const showSearchResults = query.trim().length > 0 && searchResults !== null;
  const existingIds = new Set(conversations.map((c) => c.other_user_id));
  const newPeople = (searchResults ?? []).filter((u) => !existingIds.has(u.id));

  return (
    <div className="h-full min-h-0 grid grid-cols-1 sm:grid-cols-[320px_1fr]">
      {/* LEFT: conversation list */}
      <div className={`h-full min-h-0 flex-col border-r ${activeUser ? 'hidden sm:flex' : 'flex'}`} style={{ borderColor: colors.border }}>
        <div className="p-5 pb-4 flex-shrink-0">
          <h1 className="text-xl font-semibold tracking-tight font-display" style={{ color: colors.textMain }}>
            Messages
          </h1>
          <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
            Search anyone by name to start a conversation.
          </p>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: colors.border, backgroundColor: '#F8FAFC', color: colors.textMain }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200">
                <X className="w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-2 pb-4 space-y-1">
          {showSearchResults && newPeople.length > 0 && (
            <div className="px-3 pt-1 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                Start a new conversation
              </p>
            </div>
          )}
          {showSearchResults &&
            newPeople.map((u) => {
              const accent = accentFor(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => openConversation(u.id, u.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors hover:bg-slate-50"
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: accent.bg, color: accent.color }}>
                    {initialsOf(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold" style={{ color: colors.textMain }}>
                      {u.name}
                    </span>
                    <p className="text-[11px]" style={{ color: colors.textSecondary }}>
                      {u.email}
                    </p>
                  </div>
                </button>
              );
            })}

          {showSearchResults && newPeople.length > 0 && filteredConversations.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                Conversations
              </p>
            </div>
          )}

          {filteredConversations.map((c, idx) => {
            const accent = accentFor(c.other_user_id);
            const isActive = c.other_user_id === activeUser?.id;
            return (
              <motion.button
                key={c.other_user_id}
                onClick={() => openConversation(c.other_user_id, c.other_user_name)}
                className="w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-colors"
                style={{ backgroundColor: isActive ? accent.bg : 'transparent' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                whileHover={{ backgroundColor: isActive ? accent.bg : '#F8FAFC' }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: accent.bg, color: accent.color }}>
                  {initialsOf(c.other_user_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: colors.textMain }}>
                      {c.other_user_name}
                    </span>
                    {c.last_message_time && (
                      <span className="text-[10px] flex-shrink-0" style={{ color: colors.textSecondary }}>
                        {format(new Date(c.last_message_time), 'MMM d')}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-1 truncate"
                    style={{ color: c.unread_count > 0 ? colors.textMain : colors.textSecondary, fontWeight: c.unread_count > 0 ? 600 : 400 }}
                  >
                    {c.last_message}
                  </p>
                </div>
                {c.unread_count > 0 && (
                  <span
                    className="flex-shrink-0 mt-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ backgroundColor: '#EC4899' }}
                  >
                    {c.unread_count}
                  </span>
                )}
              </motion.button>
            );
          })}

          {!showSearchResults && filteredConversations.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: colors.textSecondary }}>
              No conversations yet. Search a name above to start one.
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: active thread */}
      <div className={`h-full min-h-0 flex-col ${activeUser ? 'flex' : 'hidden sm:flex'}`}>
        <AnimatePresence mode="wait">
          {activeUser ? (
            <motion.div
              key={activeUser.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full min-h-0"
            >
              {(() => {
                const accent = accentFor(activeUser.id);
                return (
                  <>
                    <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b flex-shrink-0" style={{ borderColor: colors.border }}>
                      <button onClick={() => setActiveUser(null)} className="sm:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
                        <ArrowLeft className="w-4 h-4" style={{ color: colors.textSecondary }} />
                      </button>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: accent.bg, color: accent.color }}>
                        {initialsOf(activeUser.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold" style={{ color: colors.textMain }}>
                          {activeUser.name}
                        </h3>
                      </div>
                    </div>

                    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 space-y-1.5 scrollbar-hide" style={{ backgroundColor: '#F8FAFC' }}>
                      {thread === null ? (
                        <p className="text-xs text-center" style={{ color: colors.textSecondary }}>
                          Loading...
                        </p>
                      ) : thread.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                          <p className="text-sm font-medium" style={{ color: colors.textMain }}>
                            No messages yet
                          </p>
                          <p className="text-xs max-w-xs" style={{ color: colors.textSecondary }}>
                            Say hi to {activeUser.name.split(' ')[0]} to start the conversation.
                          </p>
                        </div>
                      ) : (
                        thread.map((msg, i) => {
                          const isMe = msg.sender_id === userId;
                          const prev = thread[i - 1];
                          const next = thread[i + 1];
                          const isGroupStart = !prev || prev.sender_id !== msg.sender_id;
                          const isGroupEnd = !next || next.sender_id !== msg.sender_id;
                          return (
                            <div key={msg.id} className={isGroupStart ? 'pt-2' : ''}>
                              <DMBubble msg={msg} isMe={isMe} accent={accent} showTime={isGroupEnd} />
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-3 sm:p-4 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
                      <div className="flex items-end gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
                        <button title="Attach a file (coming soon)" className="p-1.5 rounded-lg flex-shrink-0 cursor-not-allowed opacity-50">
                          <Paperclip className="w-4 h-4" style={{ color: colors.textSecondary }} />
                        </button>
                        <button title="Emoji (coming soon)" className="p-1.5 rounded-lg flex-shrink-0 cursor-not-allowed opacity-50">
                          <Smile className="w-4 h-4" style={{ color: colors.textSecondary }} />
                        </button>
                        <textarea
                          ref={textareaRef}
                          value={draft}
                          onChange={(e) => {
                            setDraft(e.target.value);
                            autoGrow();
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder={`Message ${activeUser.name}...`}
                          rows={1}
                          className="flex-1 text-sm outline-none bg-transparent resize-none py-1 max-h-[120px] scrollbar-hide"
                          style={{ color: colors.textMain }}
                        />
                        <motion.button
                          onClick={send}
                          disabled={!draft.trim()}
                          className="p-2 rounded-xl flex-shrink-0 disabled:opacity-40"
                          style={{ backgroundColor: colors.primary }}
                          whileHover={draft.trim() ? { scale: 1.05 } : undefined}
                          whileTap={draft.trim() ? { scale: 0.95 } : undefined}
                        >
                          <Send className="w-4 h-4 text-white" />
                        </motion.button>
                      </div>
                      <p className="text-[10px] mt-1.5 ml-1" style={{ color: colors.textSecondary }}>
                        Enter to send · Shift+Enter for a new line
                      </p>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
                <MessagesSquare className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-medium" style={{ color: colors.textMain }}>
                Select a conversation
              </p>
              <p className="text-xs max-w-xs text-center" style={{ color: colors.textSecondary }}>
                Search by name on the left, or tap one of your recent chats.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
