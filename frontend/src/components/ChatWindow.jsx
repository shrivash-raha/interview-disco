import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { BotIcon } from './Icons';

export default function ChatWindow({ messages, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-32">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-4 border border-blue-500/10">
              <BotIcon size={32} stroke="currentColor" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-medium text-gray-300">AI Interview Assistant</p>
            <p className="text-sm mt-1 text-gray-500">Start by typing or recording a message</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-md">
              <BotIcon />
            </div>
            <div className="bg-gray-700/80 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-md border border-gray-600/20">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}