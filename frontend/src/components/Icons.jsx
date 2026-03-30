import React from 'react';

export function BotIcon({ size = 14, stroke = 'white', strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

export function UserIcon({ size = 14, stroke = 'white', strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function PlayIcon({ size = 12, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" className={className}>
      <path d="M2.5 1.2a.5.5 0 01.76-.43l8 4.8a.5.5 0 010 .86l-8 4.8a.5.5 0 01-.76-.43V1.2z" />
    </svg>
  );
}

export function PauseIcon({ size = 12, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" className={className}>
      <rect x="1.5" y="1" width="3" height="10" rx="0.75" />
      <rect x="7.5" y="1" width="3" height="10" rx="0.75" />
    </svg>
  );
}