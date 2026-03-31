import React, { useEffect, useState } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
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
const THEME_STORAGE_KEY = 'interview-disco-theme';

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
  const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_STORAGE_KEY) || 'dark');
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
  const [appDialog, setAppDialog] = useState(null);
  const [dialogInputValue, setDialogInputValue] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);
  const [audioAutoStartSignal, setAudioAutoStartSignal] = useState(0);

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
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const contextReady = Boolean(
    (activeConversation?.job_description_text || '').trim() || (activeConversation?.extra_details || '').trim()
  );
  const contextLocked = Boolean(activeConversation?.context_locked);
  const interactionMode = activeConversation?.interaction_mode || 'text';
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
    if (!token || !activeConversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      try {
        const items = await fetchConversationMessages(activeConversationId, token);
        if (!cancelled) {
          const shouldAutoPlayOpeningAudio = (
            interactionMode === 'audio' &&
            items.length > 0 &&
            !items.some((message) => message.sender === 'user') &&
            items.some((message) => message.sender === 'assistant' && message.type === 'audio')
          );

          if (shouldAutoPlayOpeningAudio) {
            const openingAudioId = [...items]
              .reverse()
              .find((message) => message.sender === 'assistant' && message.type === 'audio')?.id;

            setMessages(items.map((message) => (
              message.id === openingAudioId
                ? { ...message, autoPlay: true }
                : message
            )));
          } else {
            setMessages(items);
          }
        }
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
  }, [activeConversationId, token, interactionMode]);

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

  const openAlertDialog = (message, title = 'Notice') => {
    setDialogInputValue('');
    setAppDialog({
      kind: 'alert',
      title,
      message,
      confirmLabel: 'OK',
    });
  };

  const openConfirmDialog = ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm }) => {
    setDialogInputValue('');
    setAppDialog({
      kind: 'confirm',
      title,
      message,
      confirmLabel,
      cancelLabel,
      onConfirm,
    });
  };

  const openPromptDialog = ({
    title,
    message,
    initialValue = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
  }) => {
    setDialogInputValue(initialValue);
    setAppDialog({
      kind: 'prompt',
      title,
      message,
      confirmLabel,
      cancelLabel,
      onConfirm,
    });
  };

  const closeAppDialog = () => {
    if (dialogLoading) return;
    setAppDialog(null);
    setDialogInputValue('');
  };

  const handleAppDialogConfirm = async () => {
    if (!appDialog?.onConfirm) {
      closeAppDialog();
      return;
    }

    setDialogLoading(true);
    try {
      await appDialog.onConfirm(dialogInputValue);
      setAppDialog(null);
      setDialogInputValue('');
    } catch (err) {
      setAppDialog(null);
      setDialogInputValue('');
      openAlertDialog(err.message || 'Something went wrong');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleSelectConversation = (conversationId) => {
    if (conversationId === activeConversationId) return;
    if (timedInterviewLocked) {
      setControlModalOpen(true);
      openAlertDialog('Pause or stop the active timed interview before switching conversations.');
      return;
    }
    setActiveConversationId(conversationId);
  };

  const handleToggleSidebar = () => {
    if (timedInterviewLocked) return;
    setSidebarCollapsed((current) => !current);
  };

  const handleDeleteConversation = (conversationId) => {
    openConfirmDialog({
      title: 'Delete Practice Interview',
      message: 'Delete this conversation?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        await deleteConversation(conversationId, token);
        const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
        setConversations(remaining);
        setActiveConversationId((currentId) => (
          currentId === conversationId ? (remaining[0]?.id ?? null) : currentId
        ));
        if (activeConversationId === conversationId) {
          setMessages([]);
        }
      },
    });
  };

  const confirmStopInterview = () => {
    openConfirmDialog({
      title: 'Stop Practice Interview',
      message: 'Stop this practice interview? You will still be able to view previous chats, but you cannot send more responses.',
      confirmLabel: 'Stop Interview',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        if (!activeConversationId) return;
        setInterviewActionLoading(true);
        try {
          const updatedConversation = await stopInterview(activeConversationId, token);
          syncConversation(updatedConversation);
          setControlModalOpen(false);
        } finally {
          setInterviewActionLoading(false);
        }
      },
    });
  };

  const promptExtendInterview = (defaultMinutes) => {
    openPromptDialog({
      title: 'Extend Practice Interview',
      message: 'Extend by how many minutes?',
      initialValue: defaultMinutes,
      confirmLabel: 'Extend',
      cancelLabel: 'Cancel',
      onConfirm: async (rawMinutes) => {
        const extensionMinutes = Number(rawMinutes);
        if (!Number.isFinite(extensionMinutes) || extensionMinutes <= 0) {
          throw new Error('Enter a valid number of minutes');
        }
        await handleResumeInterview({ extension_minutes: extensionMinutes });
      },
    });
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
          autoPlay: interactionMode === 'audio' && res.type === 'audio',
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
          autoPlay: interactionMode === 'audio' && res.type === 'audio',
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
      openAlertDialog(err.message || 'Could not save conversation context', 'Save Failed');
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
      openAlertDialog(err.message || 'Could not pause the practice interview', 'Pause Failed');
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
      openAlertDialog(err.message || 'Could not resume the practice interview', 'Resume Failed');
    } finally {
      setInterviewActionLoading(false);
    }
  };

  const handleStopInterview = async () => {
    confirmStopInterview();
  };

  const handleAssistantAutoPlayEnded = (messageId) => {
    setMessages((prev) => prev.map((message) => (
      message.id === messageId ? { ...message, autoPlay: false } : message
    )));
    if (interactionMode === 'audio') {
      setAudioAutoStartSignal((current) => current + 1);
    }
  };

  useEffect(() => {
    if (timerExpired || interviewPaused) {
      setControlModalOpen(true);
    }
  }, [timerExpired, interviewPaused]);

  if (!token || !user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        loading={authLoading}
        error={authError}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />
    );
  }

  const handleExpiredContinue = async (mode) => {
    if (mode === 'indefinite') {
      await handleResumeInterview({ continue_indefinitely: true });
      return;
    }

    promptExtendInterview(mode === 'few' ? '5' : '10');
  };

  const isDestructiveDialog = Boolean(
    appDialog?.confirmLabel &&
    ['delete', 'stop interview'].includes(appDialog.confirmLabel.toLowerCase())
  );

  return (
    <div className={`min-h-screen md:h-screen flex flex-col md:flex-row ${theme === 'dark' ? 'bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] text-white' : 'bg-[linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_48%,_#e2ebf7_100%)] text-slate-900'}`}>
      <ConversationSidebar
        theme={theme}
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
        <header className={`shrink-0 backdrop-blur-md px-4 py-4 ${theme === 'dark' ? 'border-b border-white/10 bg-slate-900/60' : 'border-b border-slate-200 bg-white/70'}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-cyan-400/15 border border-cyan-300/20' : 'bg-cyan-500/10 border border-cyan-500/20'}`}>
              <BotIcon size={18} stroke={theme === 'dark' ? '#67e8f9' : '#0891b2'} strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-semibold tracking-wide">
                {activeConversation?.name || 'No conversation selected'}
              </h1>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
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
                              : interactionMode === 'audio'
                                ? 'Audio practice'
                                : interactionMode === 'video'
                                  ? 'Video practice coming later'
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
                className={`rounded-2xl px-4 py-2 text-sm ${theme === 'dark' ? 'border border-white/10 text-slate-200 hover:bg-white/5' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
              >
                {contextLocked ? 'View context' : 'Edit context'}
              </button>
            ) : null}
            {activeConversation ? (
              <button
                onClick={() => setControlModalOpen(true)}
                className={`rounded-2xl px-4 py-2 text-sm ${theme === 'dark' ? 'border border-white/10 text-slate-200 hover:bg-white/5' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
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
            <button
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                theme === 'dark'
                  ? 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  : 'border border-slate-300 bg-white/70 text-slate-600 hover:bg-slate-100'
              }`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {interviewPaused ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className={`max-w-md rounded-[28px] px-6 py-8 text-center ${theme === 'dark' ? 'border border-white/10 bg-slate-950/40' : 'border border-slate-200 bg-white/80 shadow-sm'}`}>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Practice Interview Paused</h2>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Chat history is hidden while paused. Resume to continue and view previous messages again.
              </p>
            </div>
          </div>
        ) : (
          <ChatWindow theme={theme} messages={messages} loading={loading} onAutoPlayEnded={handleAssistantAutoPlayEnded} />
        )}

        <InputBox
          theme={theme}
          onSendText={handleSendText}
          onSendAudio={handleSendAudio}
          disabled={sendDisabled}
          conversationMode={interactionMode}
          autoStartAudioSignal={audioAutoStartSignal}
        />
      </main>

      <ConversationContextModal
        theme={theme}
        open={modalMode !== null}
        title={modalMode === 'create' ? 'New Practice Interview' : 'Practice Context'}
        submitLabel={modalMode === 'create' ? 'Create practice interview' : 'Save context'}
        conversation={modalMode === 'create' ? null : activeConversation}
        initialValues={modalMode === 'create' ? { timerEnabled: false, timerTotalMinutes: 30, interactionMode: 'text' } : null}
        onClose={closeContextModal}
        onSave={handleSaveConversationContext}
        onExtractJobDescription={(file) => extractJobDescription(file, token)}
        onError={(message) => openAlertDialog(message, 'Job Description Error')}
        loading={contextSaving}
        readOnly={modalMode !== 'create' && contextLocked}
      />

      {controlModalOpen && activeConversation ? (
        <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm px-4 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-slate-900/20'}`}>
          <div className={`w-full max-w-lg rounded-[28px] shadow-2xl ${theme === 'dark' ? 'border border-white/10 bg-[#0b1220] shadow-black/40' : 'border border-slate-200 bg-white shadow-slate-300/40'}`}>
            <div className={`flex items-start justify-between gap-4 px-6 py-5 ${theme === 'dark' ? 'border-b border-white/10' : 'border-b border-slate-200'}`}>
              <div>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Practice Interview Controls</h2>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
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
                className={`rounded-xl px-3 py-2 text-sm ${theme === 'dark' ? 'border border-white/10 text-slate-300 hover:bg-white/5' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
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

      {appDialog ? (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm px-4 ${theme === 'dark' ? 'bg-slate-950/75' : 'bg-slate-900/20'}`}>
          <div className={`w-full max-w-md rounded-[28px] shadow-2xl ${theme === 'dark' ? 'border border-white/10 bg-[#0b1220] shadow-black/40' : 'border border-slate-200 bg-white shadow-slate-300/40'}`}>
            <div className={`px-6 py-5 ${theme === 'dark' ? 'border-b border-white/10' : 'border-b border-slate-200'}`}>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{appDialog.title}</h2>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{appDialog.message}</p>
            </div>
            <div className="px-6 py-6">
              {appDialog.kind === 'prompt' ? (
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={dialogInputValue}
                  onChange={(e) => setDialogInputValue(e.target.value)}
                  className={`w-full rounded-2xl px-4 py-3 text-sm outline-none ${theme === 'dark' ? 'bg-slate-950/70 border border-white/10 text-white focus:border-cyan-400/50' : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500/50'}`}
                />
              ) : null}
              <div className="mt-5 flex justify-end gap-3">
                {appDialog.kind !== 'alert' ? (
                  <button
                    onClick={closeAppDialog}
                    disabled={dialogLoading}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    {appDialog.cancelLabel || 'Cancel'}
                  </button>
                ) : null}
                <button
                  onClick={handleAppDialogConfirm}
                  disabled={dialogLoading}
                  className={`rounded-xl px-4 py-2 text-sm disabled:opacity-50 ${
                    isDestructiveDialog
                      ? theme === 'dark'
                        ? 'border border-rose-400/40 bg-rose-600/70 text-rose-50'
                        : 'border border-rose-300 bg-rose-600 text-white'
                      : theme === 'dark'
                        ? 'border border-cyan-400/30 bg-cyan-600/70 text-cyan-50'
                        : 'border border-cyan-300 bg-cyan-600 text-white'
                  }`}
                >
                  {dialogLoading ? 'Working...' : appDialog.confirmLabel || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
