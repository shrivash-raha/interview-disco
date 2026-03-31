import React, { useEffect, useState } from 'react';
import { FiMic, FiType, FiSend } from 'react-icons/fi';
import AudioRecorder from './AudioRecorder';

export default function InputBox({
  theme = 'dark',
  onSendText,
  onSendAudio,
  disabled,
  conversationMode = 'text',
  autoStartAudioSignal = 0,
}) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('text'); // 'text' | 'audio'

  useEffect(() => {
    if (conversationMode === 'audio') {
      setMode('audio');
      return;
    }
    setMode('text');
  }, [conversationMode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSwitchToAudio = () => {
    setMode('audio');
  };

  const handleAudioDone = (audioBlob) => {
    onSendAudio(audioBlob);
    if (conversationMode !== 'audio') {
      setMode('text');
    }
  };

  const handleAudioDiscard = () => {
    if (conversationMode !== 'audio') {
      setMode('text');
    }
  };

  return (
    <div className={`backdrop-blur-md px-4 py-3 ${theme === 'dark' ? 'border-t border-gray-700/50 bg-gray-800/80' : 'border-t border-slate-200 bg-white/80'}`}>
      <div className="max-w-3xl mx-auto">
        {conversationMode === 'video' ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${theme === 'dark' ? 'border border-amber-300/20 bg-amber-400/10 text-amber-100' : 'border border-amber-300/40 bg-amber-50 text-amber-700'}`}>
            Video mode is not enabled yet.
          </div>
        ) : conversationMode === 'audio' ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <AudioRecorder
                theme={theme}
                onSend={handleAudioDone}
                onDiscard={handleAudioDiscard}
                disabled={disabled}
                autoStartSignal={autoStartAudioSignal}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
        {mode === 'text' ? (
          <>
            {conversationMode === 'text' ? (
              <button
                onClick={handleSwitchToAudio}
                disabled={disabled}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 group ${theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30 hover:border-gray-500/30' : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-400'}`}
                title="Switch to audio"
              >
                <FiMic className={`w-[18px] h-[18px] ${theme === 'dark' ? 'text-gray-400 group-hover:text-gray-200' : 'text-slate-500 group-hover:text-slate-700'}`} />
              </button>
            ) : null}

            <form onSubmit={handleSubmit} className="flex-1 flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={1}
                placeholder="Type your message..."
                className={`flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none disabled:opacity-50 max-h-32 overflow-y-auto transition-all duration-200 ${theme === 'dark' ? 'bg-gray-700/50 text-white focus:ring-2 focus:ring-blue-500/50 placeholder-gray-500 border border-gray-600/30 focus:border-blue-500/30' : 'bg-white text-slate-900 focus:ring-2 focus:ring-cyan-500/30 placeholder-slate-400 border border-slate-300 focus:border-cyan-500/30'}`}
                style={{ minHeight: '42px' }}
              />
              <button
                type="submit"
                disabled={disabled || !text.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
                title="Send"
              >
                <FiSend className="w-[18px] h-[18px]" />
              </button>
            </form>
          </>
        ) : (
          <>
            {conversationMode === 'text' ? (
              <button
                onClick={() => setMode('text')}
                disabled={disabled}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 group ${theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30 hover:border-gray-500/30' : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-400'}`}
                title="Switch to text"
              >
                <FiType className={`w-[18px] h-[18px] ${theme === 'dark' ? 'text-gray-400 group-hover:text-gray-200' : 'text-slate-500 group-hover:text-slate-700'}`} />
              </button>
            ) : null}

            <div className="flex-1">
              <AudioRecorder
                theme={theme}
                onSend={handleAudioDone}
                onDiscard={handleAudioDiscard}
                disabled={disabled}
                autoStartSignal={0}
              />
            </div>
          </>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
