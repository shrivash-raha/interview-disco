import React, { useRef, useState, useEffect } from 'react';
import { PlayIcon, PauseIcon } from './Icons';
import { formatTime } from '../utils/formatTime';

const PLAYBACK_RATE_STORAGE_KEY = 'interview_disco_playback_rate';

export default function WaveformPlayer({ src, transcript, autoPlay = false, onAutoPlayEnded, theme = 'dark', variant = 'assistant' }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    const storedValue = window.localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
    const parsedValue = Number(storedValue);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
  });
  const [bars] = useState(() => Array.from({ length: 35 }, () => Math.random() * 0.7 + 0.15));

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
    window.localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(playbackRate));
  }, [playbackRate]);

  useEffect(() => {
    if (!autoPlay || !audioRef.current) return;
    const playPromise = audioRef.current.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
    setPlaying(true);
  }, [autoPlay, src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const progress = duration ? currentTime / duration : 0;
      const barWidth = (w / bars.length) * 0.55;
      const gap = (w / bars.length) * 0.45;

      bars.forEach((val, i) => {
        const x = i * (barWidth + gap);
        const barH = val * h * 0.85;
        const y = (h - barH) / 2;
        const barProgress = (i + 1) / bars.length;

        if (barProgress <= progress) {
          ctx.fillStyle = variant === 'user'
            ? '#dbeafe'
            : theme === 'dark'
              ? '#93c5fd'
              : '#0ea5e9';
        } else {
          ctx.fillStyle = variant === 'user'
            ? 'rgba(219, 234, 254, 0.55)'
            : theme === 'dark'
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(100, 116, 139, 0.35)';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 1.5);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [bars, currentTime, duration, theme, variant]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleCanvasClick = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  return (
    <div className="min-w-[200px]">
      <div className="flex items-center gap-2.5">
        <audio
          ref={audioRef}
          src={src}
          onLoadedMetadata={() => setDuration(audioRef.current.duration || 0)}
          onTimeUpdate={() => setCurrentTime(audioRef.current.currentTime)}
          onEnded={() => {
            setPlaying(false);
            if (autoPlay && onAutoPlayEnded) {
              onAutoPlayEnded();
            }
          }}
          preload="metadata"
        />
        <button
          onClick={toggle}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
            theme === 'dark'
              ? 'bg-white/15 hover:bg-white/25'
              : 'bg-slate-200 hover:bg-slate-300 border border-slate-300'
          }`}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <PauseIcon size={12} className={theme === 'dark' ? 'text-white' : 'text-slate-700'} />
          ) : (
            <PlayIcon size={12} className={`${theme === 'dark' ? 'text-white' : 'text-slate-700'} ml-0.5`} />
          )}
        </button>
        <div className="flex-1 flex flex-col gap-0.5">
          <canvas
            ref={canvasRef}
            className="w-full h-7 cursor-pointer rounded"
            onClick={handleCanvasClick}
          />
          <div className="flex justify-between text-[10px] opacity-60 px-0.5 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex items-center justify-between gap-3">
          {transcript ? (
            <button
              type="button"
              onClick={() => setTranscriptOpen((prev) => !prev)}
              className={`text-[10px] italic tracking-[0.12em] opacity-70 ${theme === 'dark' ? 'text-cyan-200 hover:text-cyan-100' : 'text-cyan-700 hover:text-cyan-800'}`}
            >
              {transcriptOpen ? 'Hide text' : 'Text'}
            </button>
          ) : <div />}
          <label className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] justify-end ${theme === 'dark' ? 'text-slate-300/80' : 'text-slate-500'}`}>
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className={`rounded-xl px-2 py-1 text-[11px] outline-none ${theme === 'dark' ? 'border border-white/10 bg-slate-950/70 text-white' : 'border border-slate-300 bg-white text-slate-900'}`}
            >
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </label>
        </div>
        {transcript && transcriptOpen ? (
          <div className={`mt-2 rounded-2xl px-3 py-2 text-xs leading-relaxed ${theme === 'dark' ? 'border border-white/10 bg-slate-950/70 text-slate-100' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}>
            {transcript}
          </div>
        ) : null}
      </div>
    </div>
  );
}
