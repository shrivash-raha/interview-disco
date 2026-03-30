import React, { useState } from 'react';
import { FiMic, FiType, FiSend } from 'react-icons/fi';
import AudioRecorder from './AudioRecorder';

export default function InputBox({ onSendText, onSendAudio, disabled }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('text'); // 'text' | 'audio'

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
    setMode('text'); // Switch back to text after sending
  };

  const handleAudioDiscard = () => {
    setMode('text'); // Switch back to text after discarding
  };

  return (
    <div className="border-t border-gray-700/50 bg-gray-800/80 backdrop-blur-md px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        {mode === 'text' ? (
          <>
            {/* Mic button switches to audio mode and starts recording instantly */}
            <button
              onClick={handleSwitchToAudio}
              disabled={disabled}
              className="shrink-0 w-10 h-10 rounded-xl bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center transition-all duration-200 disabled:opacity-50 border border-gray-600/30 hover:border-gray-500/30 group"
              title="Switch to audio"
            >
              <FiMic className="w-[18px] h-[18px] text-gray-400 group-hover:text-gray-200" />
            </button>

            <form onSubmit={handleSubmit} className="flex-1 flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={1}
                placeholder="Type your message..."
                className="flex-1 resize-none bg-gray-700/50 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-500 disabled:opacity-50 max-h-32 overflow-y-auto border border-gray-600/30 focus:border-blue-500/30 transition-all duration-200"
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
            {/* Text button switches back to text mode */}
            <button
              onClick={() => setMode('text')}
              disabled={disabled}
              className="shrink-0 w-10 h-10 rounded-xl bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center transition-all duration-200 disabled:opacity-50 border border-gray-600/30 hover:border-gray-500/30 group"
              title="Switch to text"
            >
              <FiType className="w-[18px] h-[18px] text-gray-400 group-hover:text-gray-200" />
            </button>

            <div className="flex-1">
              <AudioRecorder
                onSend={handleAudioDone}
                onDiscard={handleAudioDiscard}
                disabled={disabled}
                autoStart
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}