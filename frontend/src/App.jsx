import React, { useState, useCallback } from 'react';
import ChatWindow from './components/ChatWindow';
import InputBox from './components/InputBox';
import { BotIcon } from './components/Icons';
import { sendTextMessage, sendAudioMessage } from './services/api';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSendText = useCallback(
    async (text) => {
      const userMsg = {
        id: generateId(),
        type: 'text',
        sender: 'user',
        content: text,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      setLoading(true);

      try {
        const res = await sendTextMessage(text);
        const assistantMsg = {
          id: generateId(),
          type: res.type,
          sender: 'assistant',
          content: res.content,
          timestamp: Date.now(),
        };
        addMessage(assistantMsg);
      } catch (err) {
        console.error(err);
        addMessage({
          id: generateId(),
          type: 'text',
          sender: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: Date.now(),
        });
      } finally {
        setLoading(false);
      }
    },
    [addMessage]
  );

  const handleSendAudio = useCallback(
    async (audioBlob) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      const userMsg = {
        id: generateId(),
        type: 'audio',
        sender: 'user',
        content: audioUrl,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      setLoading(true);

      try {
        const res = await sendAudioMessage(audioBlob);
        const assistantMsg = {
          id: generateId(),
          type: res.type,
          sender: 'assistant',
          content: res.content,
          timestamp: Date.now(),
        };
        addMessage(assistantMsg);
      } catch (err) {
        console.error(err);
        addMessage({
          id: generateId(),
          type: 'text',
          sender: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: Date.now(),
        });
      } finally {
        setLoading(false);
      }
    },
    [addMessage]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-700/50 bg-gray-800/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BotIcon size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI Interview Assistant</h1>
            <p className="text-[11px] text-gray-400">Text & voice powered</p>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <ChatWindow messages={messages} loading={loading} />

      {/* Input */}
      <InputBox
        onSendText={handleSendText}
        onSendAudio={handleSendAudio}
        disabled={loading}
      />
    </div>
  );
}