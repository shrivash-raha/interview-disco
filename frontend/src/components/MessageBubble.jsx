import React from 'react';
import { BotIcon, UserIcon } from './Icons';
import WaveformPlayer from './WaveformPlayer';

export default function MessageBubble({ message }) {
  const isUser = message.sender === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-md">
          <BotIcon />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-700/80 text-gray-100 rounded-bl-sm border border-gray-600/20'
        }`}
      >
        {message.type === 'text' ? (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        ) : (
          <WaveformPlayer src={message.content} />
        )}
        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-blue-200/70' : 'text-gray-400/70'} text-right`}>
          {time}
        </p>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 ml-2 mt-1 shadow-md">
          <UserIcon />
        </div>
      )}
    </div>
  );
}