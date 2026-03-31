import React, { useRef, useState, useEffect } from 'react';
import { PlayIcon, PauseIcon } from './Icons';
import { formatTime } from '../utils/formatTime';

export default function WaveformPlayer({ src, transcript }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [bars] = useState(() => Array.from({ length: 35 }, () => Math.random() * 0.7 + 0.15));

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
          ctx.fillStyle = '#93c5fd';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
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
  }, [bars, currentTime, duration]);

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
          onEnded={() => setPlaying(false)}
          preload="metadata"
        />
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all duration-200 shrink-0"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <PauseIcon size={12} className="text-white" />
          ) : (
            <PlayIcon size={12} className="text-white ml-0.5" />
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
      {transcript ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setTranscriptOpen((prev) => !prev)}
            className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/80 hover:text-cyan-100"
          >
            {transcriptOpen ? 'Hide transcript' : 'Transcript'}
          </button>
          {transcriptOpen ? (
            <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs leading-relaxed text-slate-100">
              {transcript}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
