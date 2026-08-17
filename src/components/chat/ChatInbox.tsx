'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import EmojiPicker, { EMOJI_FONT } from '@/components/chat/EmojiPicker';
import VoiceNote from '@/components/chat/VoiceNote';

type SessionUser = {
  id: string;
  name: string;
  role: 'user' | 'artisan' | 'admin';
};

type Conversation = {
  id: string;
  userId: string;
  artisanId: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  artisan: { id: string; trade?: string; user: { id: string; name: string; avatarUrl?: string | null } };
  lastMessage: { type: string; body: string | null; createdAt: string; fileUrl?: string | null } | null;
};

type ChatMessage = {
  id: string;
  senderId: string;
  type: 'text' | 'file' | 'audio';
  body: string | null;
  fileUrl: string | null;
  createdAt: string;
};

type ArtisanOption = {
  id: string;
  trade: string;
  user: { name: string };
};

function initials(name?: string | null) {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || '?'
  );
}

function preview(c: Conversation) {
  if (c.lastMessage?.type === 'audio') return 'Voice note';
  if (c.lastMessage?.type === 'file') {
    return isImageAttachment(c.lastMessage.fileUrl, c.lastMessage.body) ? 'Photo' : 'Document';
  }
  if (c.lastMessage?.body) return c.lastMessage.body;
  return 'No messages yet';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isImageAttachment(url?: string | null, body?: string | null) {
  return /\.(png|jpe?g|webp|gif)$/i.test(`${url || ''} ${body || ''}`);
}

function isFilenameCaption(body?: string | null) {
  if (!body) return true;
  return /\.(png|jpe?g|webp|gif|pdf)$/i.test(body.trim());
}

function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md';
}) {
  const cls = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-11 h-11 text-xs';
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={`${cls} rounded-full object-cover shrink-0`} />
    );
  }
  return (
    <div
      className={`${cls} rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold shrink-0`}
    >
      {initials(name)}
    </div>
  );
}

export default function ChatInbox() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [artisans, setArtisans] = useState<ArtisanOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState({ bottom: 80, left: 16, width: 340 });
  const previewUrl = useMemo(() => {
    if (!pendingFile?.type.startsWith('image/')) return null;
    return URL.createObjectURL(pendingFile);
  }, [pendingFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!emojiOpen) return;
    const place = () => {
      const btn = emojiBtnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 24);
      const left = Math.min(Math.max(12, r.left), window.innerWidth - width - 12);
      setPickerPos({
        bottom: Math.max(12, window.innerHeight - r.top + 8),
        left,
        width,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [emojiOpen]);

  const loadSession = useCallback(async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      setSession(null);
      return;
    }
    const data = await res.json();
    setSession(data.user || null);
  }, []);

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/chat/conversations');
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations || []);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (session?.role === 'user' || session?.role === 'artisan') {
      loadConversations();
    }
    if (session?.role === 'user') {
      fetch('/api/artisans')
        .then((r) => r.json())
        .then((data) => setArtisans(data.artisans || []))
        .catch(() => undefined);
    }
  }, [session, loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const load = async () => {
      const res = await fetch(`/api/chat/conversations/${activeId}/messages`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setMessages(data.messages || []);
    };
    load();
    const timer = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages, activeId]);

  const startConversation = async (artisanId: string) => {
    setError('');
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artisanId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not start chat.');
      return;
    }
    await loadConversations();
    setActiveId(data.conversationId);
  };

  const send = async (payload: { type: 'text' | 'file' | 'audio'; body?: string; file?: File }) => {
    if (!activeId) return;
    setSending(true);
    setError('');
    try {
      const form = new FormData();
      form.append('type', payload.type);
      if (payload.body) form.append('body', payload.body);
      if (payload.file) form.append('file', payload.file);
      const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send.');
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setDraft('');
      setPendingFile(null);
      setEmojiOpen(false);
      await loadConversations();
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      setDraft((d) => d + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const toggleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType.split(';')[0] || 'audio/webm',
        });
        const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
        await send({ type: 'audio', file });
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError('Microphone permission is required for voice notes.');
    }
  };

  const peerName = (c: Conversation) =>
    session?.role === 'artisan' ? c.user.name : c.artisan.user.name;

  const peerAvatar = (c: Conversation) =>
    session?.role === 'artisan' ? c.user.avatarUrl : c.artisan.user.avatarUrl;

  const active = conversations.find((c) => c.id === activeId);

  const newArtisans = useMemo(() => {
    const open = new Set(conversations.map((c) => c.artisanId));
    return artisans.filter((a) => !open.has(a.id)).slice(0, 12);
  }, [artisans, conversations]);

  return (
    <div className="h-full min-h-0 flex flex-col md:flex-row rounded-none md:rounded-4xl border-0 md:border border-border bg-card overflow-hidden shadow-sm">
      <aside
        className={`${
          activeId ? 'hidden md:flex' : 'flex'
        } w-full md:w-[22rem] lg:w-96 shrink-0 flex-col border-r border-border min-h-0 bg-background/40`}
      >
        <div className="px-5 py-5 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Inbox</p>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {session?.role === 'artisan' ? 'Messages from customers' : 'Message verified artisans'}
          </p>
        </div>
        {error && !activeId && <p className="px-5 pt-3 text-xs text-red-600">{error}</p>}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.map((c) => {
            const name = peerName(c);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveId(c.id);
                  setError('');
                  setEmojiOpen(false);
                }}
                className={`w-full text-left rounded-2xl px-3 py-3 flex items-center gap-3 transition-colors ${
                  activeId === c.id
                    ? 'bg-primary/10 border border-primary/25'
                    : 'hover:bg-muted/70 border border-transparent'
                }`}
              >
                <Avatar name={name} src={peerAvatar(c)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                    {c.lastMessage?.createdAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(c.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs text-muted-foreground truncate mt-0.5"
                    style={{ fontFamily: EMOJI_FONT }}
                  >
                    {preview(c)}
                  </p>
                </div>
              </button>
            );
          })}
          {session?.role === 'user' && newArtisans.length > 0 && (
            <div className="pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">
                Start a chat
              </p>
              {newArtisans.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => startConversation(a.id)}
                  className="w-full text-left rounded-2xl px-3 py-2.5 flex items-center gap-3 hover:bg-muted transition-colors"
                >
                  <Avatar name={a.user.name} size="sm" />
                  <span className="text-sm min-w-0">
                    <span className="font-medium text-foreground">{a.user.name}</span>
                    <span className="text-muted-foreground"> · {a.trade}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {conversations.length === 0 && session?.role === 'artisan' && (
            <p className="text-sm text-muted-foreground p-4 text-center">
              Customers can start a chat with you from their account.
            </p>
          )}
        </div>
      </aside>

      <section className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 min-h-0 flex-col bg-card`}>
        {!activeId || !session ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Icon name="ChatBubbleLeftRightIcon" size={26} />
              </div>
              <p className="font-semibold text-foreground">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Pick someone from the list to start messaging.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-background/50">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="md:hidden w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label="Back to conversations"
              >
                <Icon name="ArrowLeftIcon" size={18} />
              </button>
              {active && <Avatar name={peerName(active)} src={peerAvatar(active)} size="sm" />}
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {active ? peerName(active) : 'Conversation'}
                </p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {session.role === 'artisan' ? 'Customer' : active?.artisan.trade || 'Artisan'}
                </p>
              </div>
            </div>

            <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.05),_transparent_55%)]">
              {messages.map((m, i) => {
                const mine = m.senderId === session.id;
                const showDay = i === 0 || !sameDay(messages[i - 1].createdAt, m.createdAt);
                return (
                  <div key={m.id}>
                    {showDay && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center py-3">
                        {formatDay(m.createdAt)}
                      </p>
                    )}
                    <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && active && (
                        <Avatar name={peerName(active)} src={peerAvatar(active)} size="sm" />
                      )}
                      <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                        {m.type === 'text' && (
                          <div
                            className={`rounded-3xl px-4 py-2.5 text-sm ${
                              mine
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted text-foreground rounded-bl-md'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed" style={{ fontFamily: EMOJI_FONT }}>
                              {m.body}
                            </p>
                          </div>
                        )}
                        {m.type === 'file' && m.fileUrl && isImageAttachment(m.fileUrl, m.body) && (
                          <a href={m.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-3xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.fileUrl}
                              alt="Photo"
                              className="max-w-[240px] w-full object-cover"
                            />
                            {m.body && !isFilenameCaption(m.body) && (
                              <p
                                className={`px-3 py-2 text-sm ${
                                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                                }`}
                              >
                                {m.body}
                              </p>
                            )}
                          </a>
                        )}
                        {m.type === 'file' && m.fileUrl && !isImageAttachment(m.fileUrl, m.body) && (
                          <a
                            href={m.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-3 min-w-[180px] rounded-3xl px-4 py-3 ${
                              mine
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted text-foreground rounded-bl-md'
                            }`}
                          >
                            <span
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                mine ? 'bg-white/20' : 'bg-primary/10 text-primary'
                              }`}
                            >
                              <Icon name="DocumentTextIcon" size={20} />
                            </span>
                            <span>
                              <span className="block text-xs font-bold uppercase tracking-widest">PDF</span>
                              <span className="block text-sm font-medium">Document</span>
                            </span>
                          </a>
                        )}
                        {m.type === 'audio' && m.fileUrl && (
                          <div
                            className={`rounded-3xl px-4 py-2.5 ${
                              mine
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted text-foreground rounded-bl-md'
                            }`}
                          >
                            <VoiceNote src={m.fileUrl} mine={mine} />
                          </div>
                        )}
                        <p className={`text-[11px] mt-1 px-1 text-muted-foreground ${mine ? 'text-right' : 'text-left'}`}>
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <p className="px-4 pb-1 text-xs text-red-600">{error}</p>}

            <div className="p-3 border-t border-border bg-card">
              {emojiOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    className="fixed z-[80]"
                    style={{
                      bottom: pickerPos.bottom,
                      left: pickerPos.left,
                      width: pickerPos.width,
                    }}
                  >
                    <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />
                  </div>,
                  document.body,
                )}
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (pendingFile) {
                    void send({
                      type: 'file',
                      file: pendingFile,
                      body: draft.trim() || undefined,
                    });
                    return;
                  }
                  if (draft.trim()) void send({ type: 'text', body: draft.trim() });
                }}
              >
                {pendingFile && (
                  <div className="rounded-2xl border border-border bg-muted/50 p-3 flex items-start gap-3">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={pendingFile.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 text-primary">
                        <Icon name="DocumentTextIcon" size={22} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{pendingFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pendingFile.type || 'File'} · {formatBytes(pendingFile.size)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Preview ready — tap Send to share, or add a caption.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove file"
                      onClick={() => setPendingFile(null)}
                      className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground"
                    >
                      <Icon name="XMarkIcon" size={16} />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0 rounded-3xl border border-border bg-background px-2 py-1.5 flex items-end gap-1">
                  <button
                    ref={emojiBtnRef}
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setEmojiOpen((v) => !v)}
                    aria-label="Emoji"
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg ${
                      emojiOpen ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    style={{ fontFamily: EMOJI_FONT }}
                  >
                    😊
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Attach file"
                    className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground"
                  >
                    <Icon name="PaperClipIcon" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleRecord}
                    aria-label={recording ? 'Stop recording' : 'Record voice note'}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      recording ? 'bg-red-500 text-white' : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon name="MicrophoneIcon" size={18} />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={draft}
                    rows={1}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (pendingFile) {
                          void send({
                            type: 'file',
                            file: pendingFile,
                            body: draft.trim() || undefined,
                          });
                          return;
                        }
                        if (draft.trim()) void send({ type: 'text', body: draft.trim() });
                      }
                    }}
                    placeholder={
                      recording
                        ? 'Recording… tap mic to send'
                        : pendingFile
                          ? 'Add a caption…'
                          : 'Type a message…'
                    }
                    className="flex-1 min-w-0 max-h-28 resize-none px-2 py-2 bg-transparent text-sm focus:outline-none"
                    style={{ fontFamily: EMOJI_FONT }}
                  />
                </div>
                <Button type="submit" loading={sending} className="!min-h-[44px] !px-5 shrink-0">
                  Send
                </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingFile(file);
                      setEmojiOpen(false);
                    }
                    e.target.value = '';
                  }}
                />
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
