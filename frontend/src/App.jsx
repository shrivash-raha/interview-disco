import React, { useEffect, useState } from 'react';
import ChatWindow from './components/ChatWindow';
import ConversationContextModal from './components/ConversationContextModal';
import ConversationSidebar from './components/ConversationSidebar';
import InputBox from './components/InputBox';
import LoginScreen from './components/LoginScreen';
import { BotIcon } from './components/Icons';
import {
  createConversation,
  deleteConversation,
  extractJobDescription,
  fetchConversationMessages,
  fetchCurrentUser,
  listConversations,
  login,
  logout,
  pauseInterview,
  resumeInterview,
  sendAudioMessage,
  sendTextMessage,
  stopInterview,
  updateConversationContext,
} from './services/api';

const SESSION_TOKEN_KEY = 'interview-disco-token';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function parseServerDate(value) {
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  const timestamp = new Date(normalized).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export default function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem(SESSION_TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(window.localStorage.getItem(SESSION_TOKEN_KEY)));
  const [authError, setAuthError] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contextSaving, setContextSaving] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [modalMode, setModalMode] = useState(null);
  const [interviewActionLoading, setInterviewActionLoading] = useState(false);
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    async function bootstrapSession() {
      setAuthLoading(true);
      setAuthError('');
      try {
        const [currentUser, items] = await Promise.all([
          fetchCurrentUser(token),
          listConversations(token),
        ]);
        if (cancelled) return;
        setUser(currentUser);
        setConversations(items);
        setActiveConversationId((currentActive) => {
          if (currentActive && items.some((item) => item.id === currentActive)) return currentActive;
          return items[0]?.id ?? null;
        });
      } catch (err) {
        if (cancelled) return;
        window.localStorage.removeItem(SESSION_TOKEN_KEY);
        setToken('');
        setAuthError(err.message || 'Session expired');
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!token || !activeConversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      try {
        const items = await fetchConversationMessages(activeConversationId, token);
        if (!cancelled) setMessages(items);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, token]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const contextReady = Boolean(
    (activeConversation?.job_description_text || '').trim() || (activeConversation?.extra_details || '').trim()
  );
  const contextLocked = Boolean(activeConversation?.context_locked);
  const interviewStatus = activeConversation?.interview_status || 'active';
  const timerTotalSeconds = activeConversation?.timer_total_seconds || 0;
  const timerStartedAtMs = parseServerDate(activeConversation?.timer_started_at);
  const elapsedSeconds = timerStartedAtMs ? Math.floor((timerNow - timerStartedAtMs) / 1000) : 0;
  const remainingSeconds = activeConversation?.timer_enabled
    ? (
      interviewStatus === 'paused'
        ? Math.max(0, activeConversation?.timer_remaining_seconds || 0)
        : Math.max(0, (activeConversation?.timer_remaining_seconds ?? timerTotalSeconds) - elapsedSeconds)
    )
    : null;
  const timerExpired = Boolean(activeConversation?.timer_enabled && interviewStatus !== 'stopped' && (remainingSeconds ?? 0) <= 0);
  const interviewPaused = interviewStatus === 'paused';
  const interviewStopped = interviewStatus === 'stopped';
  const sendDisabled = loading || !activeConversationId || !contextReady || timerExpired || interviewPaused || interviewStopped;
  const timedInterviewLocked = Boolean(activeConversation?.timer_enabled && interviewStatus === 'active' && !timerExpired);

  useEffect(() => {
    if (timedInterviewLocked) {
      setSidebarCollapsed(true);
      return;
    }
    if (interviewPaused || interviewStopped) {
      setSidebarCollapsed(false);
    }
  }, [timedInterviewLocked, interviewPaused, interviewStopped]);

  const handleLogin = async (email, password) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await login(email, password);
      window.localStorage.setItem(SESSION_TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) await logout(token);
    } catch (err) {
      console.error(err);
    } finally {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
      setToken('');
      setUser(null);
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      setAuthError('');
    }
  };

  const openCreateConversationModal = () => setModalMode('create');
  const openContextModal = () => setModalMode('view');
  const closeContextModal = () => setModalMode(null);

  const handleSelectConversation = (conversationId) => {
    if (conversationId === activeConversationId) return;
    if (timedInterviewLocked) {
      setControlModalOpen(true);
      window.alert('Pause or stop the active timed interview before switching conversations.');
      return;
    }
    setActiveConversationId(conversationId);
  };

  const handleToggleSidebar = () => {
    if (timedInterviewLocked) return;
    setSidebarCollapsed((current) => !current);
  };

  const handleDeleteConversation = async (conversationId) => {
    const confirmed = window.confirm('Delete this conversation?');
    if (!confirmed) return;

    try {
      await deleteConversation(conversationId, token);
      const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
      setConversations(remaining);
      setActiveConversationId((currentId) => (
        currentId === conversationId ? (remaining[0]?.id ?? null) : currentId
      ));
      if (activeConversationId === conversationId) {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Could not delete conversation');
    }
  };

  const handleSendText = async (text) => {
    if (!activeConversationId || timerExpired) return;

    const userMsg = {
      id: generateId(),
      type: 'text',
      sender: 'user',
      content: text,
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendTextMessage(text, activeConversationId, token);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          type: res.type,
          sender: 'assistant',
          content: res.content,
          text: res.text,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          type: 'text',
          sender: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          text: err.message || 'Something went wrong. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAudio = async (audioBlob) => {
    if (!activeConversationId || timerExpired) return;

    const audioUrl = URL.createObjectURL(audioBlob);
    const userMessageId = generateId();
    const userMsg = {
      id: userMessageId,
      type: 'audio',
      sender: 'user',
      content: audioUrl,
      text: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendAudioMessage(audioBlob, activeConversationId, token);
      setMessages((prev) => prev.map((message) => (
        message.id === userMessageId
          ? { ...message, text: res.userText || message.text }
          : message
      )));
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          type: res.type,
          sender: 'assistant',
          content: res.content,
          text: res.text,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          type: 'text',
          sender: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          text: err.message || 'Something went wrong. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConversationContext = async (payload) => {
    setContextSaving(true);
    try {
      if (modalMode === 'create') {
        const hasContext = Boolean((payload.jobDescriptionText || '').trim() || (payload.extraDetails || '').trim() || payload.file);
        if (!payload.name.trim()) {
          throw new Error('Conversation name is required');
        }
        if (!hasContext) {
          throw new Error('Provide job description text, upload a file, or add extra details before starting');
        }

        const conversation = await createConversation(payload.name, token);
        try {
          const updatedConversation = await updateConversationContext(conversation.id, payload, token);
          setConversations((prev) => [updatedConversation, ...prev]);
          setActiveConversationId(updatedConversation.id);
          setMessages([]);
        } catch (err) {
          await deleteConversation(conversation.id, token);
          throw err;
        }
      } else if (activeConversationId) {
        const updatedConversation = await updateConversationContext(activeConversationId, payload, token);
        setConversations((prev) => prev.map((conversation) => (
          conversation.id === updatedConversation.id ? updatedConversation : conversation
        )));
      }
      closeContextModal();
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Could not save conversation context');
    } finally {
      setContextSaving(false);
    }
  };

  const syncConversation = (updatedConversation) => {
    setConversations((prev) => prev.map((conversation) => (
      conversation.id === updatedConversation.id ? updatedConversation : conversation
    )));
  };

  const handlePauseInterview = async () => {
    if (!activeConversationId) return;
    setInterviewActionLoading(true);
    try {
      const updatedConversation = await pauseInterview(activeConversationId, token);
      syncConversation(updatedConversation);
      setControlModalOpen(false);
    } catch (err) {
      window.alert(err.message || 'Could not pause the practice interview');
    } finally {
      setInterviewActionLoading(false);
    }
  };

  const handleResumeInterview = async (payload = {}) => {
    if (!activeConversationId) return;
    setInterviewActionLoading(true);
    try {
      const updatedConversation = await resumeInterview(activeConversationId, payload, token);
      syncConversation(updatedConversation);
      setControlModalOpen(false);
    } catch (err) {
      window.alert(err.message || 'Could not resume the practice interview');
    } finally {
      setInterviewActionLoading(false);
    }
  };

  const handleStopInterview = async () => {
    if (!activeConversationId) return;
    const confirmed = window.confirm('Stop this practice interview? You will still be able to view previous chats, but you cannot send more responses.');
    if (!confirmed) return;
    setInterviewActionLoading(true);
    try {
      const updatedConversation = await stopInterview(activeConversationId, token);
      syncConversation(updatedConversation);
      setControlModalOpen(false);
    } catch (err) {
      window.alert(err.message || 'Could not stop the practice interview');
    } finally {
      setInterviewActionLoading(false);
    }
  };

  useEffect(() => {
    if (timerExpired || interviewPaused) {
      setControlModalOpen(true);
    }
  }, [timerExpired, interviewPaused]);

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} loading={authLoading} error={authError} />;
  }

  const handleExpiredContinue = async (mode) => {
    if (mode === 'indefinite') {
      await handleResumeInterview({ continue_indefinitely: true });
      return;
    }

    const rawMinutes = window.prompt('Extend by how many minutes?', mode === 'few' ? '5' : '10');
    if (!rawMinutes) return;
    const extensionMinutes = Number(rawMinutes);
    if (!Number.isFinite(extensionMinutes) || extensionMinutes <= 0) {
      window.alert('Enter a valid number of minutes');
      return;
    }
    await handleResumeInterview({ extension_minutes: extensionMinutes });
  };

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] text-white">
      <ConversationSidebar
        user={user}
        conversations={conversations}
        activeConversationId={activeConversationId}
        collapsed={sidebarCollapsed || timedInterviewLocked}
        collapseLocked={timedInterviewLocked}
        switchLocked={timedInterviewLocked}
        onSelectConversation={handleSelectConversation}
        onToggleCollapse={handleToggleSidebar}
        onCreateConversation={openCreateConversationModal}
        onDeleteConversation={handleDeleteConversation}
        onLogout={handleLogout}
        loading={loading}
      />

      <main className="flex-1 flex flex-col min-h-[60vh]">
        <header className="shrink-0 border-b border-white/10 bg-slate-900/60 backdrop-blur-md px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-400/15 border border-cyan-300/20 flex items-center justify-center">
              <BotIcon size={18} stroke="#67e8f9" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide">
                {activeConversation?.name || 'No conversation selected'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {activeConversation
                  ? (
                    contextReady
                      ? (
                        interviewStopped
                          ? 'This practice interview has been stopped'
                          : interviewPaused
                            ? 'Practice interview paused'
                            : timerExpired
                              ? 'Time is up for this practice interview'
                              : 'Text and voice practice'
                      )
                      : 'Add context before starting this practice interview'
                  )
                  : 'Create a practice interview to begin'}
              </p>
            </div>
            {activeConversation ? (
              <button
                onClick={openContextModal}
                className="ml-auto rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                {contextLocked ? 'View context' : 'Edit context'}
              </button>
            ) : null}
            {activeConversation ? (
              <button
                onClick={() => setControlModalOpen(true)}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                Interview Controls
              </button>
            ) : null}
            {activeConversation?.timer_enabled ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/70">Timer</div>
                <div className="text-sm font-semibold text-amber-100">
                  {formatTimer(remainingSeconds ?? 0)} / {formatTimer(timerTotalSeconds)}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {interviewPaused ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-md rounded-[28px] border border-white/10 bg-slate-950/40 px-6 py-8 text-center">
              <h2 className="text-lg font-semibold text-white">Practice Interview Paused</h2>
              <p className="mt-2 text-sm text-slate-400">
                Chat history is hidden while paused. Resume to continue and view previous messages again.
              </p>
            </div>
          </div>
        ) : (
          <ChatWindow messages={messages} loading={loading} />
        )}

        <InputBox
          onSendText={handleSendText}
          onSendAudio={handleSendAudio}
          disabled={sendDisabled}
        />
      </main>

      <ConversationContextModal
        open={modalMode !== null}
        title={modalMode === 'create' ? 'New Practice Interview' : 'Practice Context'}
        submitLabel={modalMode === 'create' ? 'Create practice interview' : 'Save context'}
        conversation={modalMode === 'create' ? null : activeConversation}
        initialValues={modalMode === 'create' ? { timerEnabled: true, timerTotalMinutes: 30 } : null}
        onClose={closeContextModal}
        onSave={handleSaveConversationContext}
        onExtractJobDescription={(file) => extractJobDescription(file, token)}
        loading={contextSaving}
        readOnly={modalMode !== 'create' && contextLocked}
      />

      {controlModalOpen && activeConversation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Practice Interview Controls</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {timerExpired
                    ? 'The timer has ended. Extend the interview or continue indefinitely.'
                    : interviewPaused
                      ? 'The interview is paused. Resume to continue.'
                      : interviewStopped
                        ? 'This interview has been stopped.'
                        : 'Pause, stop, or continue managing this interview.'}
                </p>
              </div>
              <button
                onClick={() => setControlModalOpen(false)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Close
              </button>
            </div>
            <div className="px-6 py-6 flex flex-wrap gap-3">
              {interviewStatus === 'active' && !timerExpired ? (
                <button
                  onClick={handlePauseInterview}
                  disabled={interviewActionLoading}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
                >
                  Pause
                </button>
              ) : null}
              {interviewPaused ? (
                <button
                  onClick={() => handleResumeInterview({})}
                  disabled={interviewActionLoading}
                  className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 disabled:opacity-50"
                >
                  Resume
                </button>
              ) : null}
              {!interviewStopped ? (
                <button
                  onClick={handleStopInterview}
                  disabled={interviewActionLoading}
                  className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 disabled:opacity-50"
                >
                  Stop Interview
                </button>
              ) : null}
              {timerExpired && !interviewStopped ? (
                <>
                  <button
                    onClick={() => handleExpiredContinue('few')}
                    disabled={interviewActionLoading}
                    className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50"
                  >
                    Extend Time
                  </button>
                  <button
                    onClick={() => handleExpiredContinue('indefinite')}
                    disabled={interviewActionLoading}
                    className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-100 disabled:opacity-50"
                  >
                    Continue Indefinitely
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
