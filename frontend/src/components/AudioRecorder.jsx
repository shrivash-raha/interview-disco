import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiSquare, FiSend, FiTrash2 } from 'react-icons/fi';
import { PlayIcon, PauseIcon } from './Icons';
import { formatTime } from '../utils/formatTime';

function WaveformPreview({ audioUrl, audioRef, isPlaying, onTogglePlay }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [bars] = useState(() => Array.from({ length: 40 }, () => Math.random() * 0.6 + 0.2));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!audioRef.current) return;

    const updateProgress = () => {
      if (audioRef.current && audioRef.current.duration) {
        setProgress(audioRef.current.currentTime / audioRef.current.duration);
      }
      animFrameRef.current = requestAnimationFrame(updateProgress);
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const barWidth = (w / bars.length) * 0.6;
      const gap = (w / bars.length) * 0.4;

      bars.forEach((val, i) => {
        const x = i * (barWidth + gap);
        const barH = val * h * 0.8;
        const y = (h - barH) / 2;
        const barProgress = (i + 1) / bars.length;

        if (barProgress <= progress) {
          ctx.fillStyle = '#60a5fa';
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [bars, progress]);

  const handleCanvasClick = (e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 flex-1">
      <button
        onClick={onTogglePlay}
        className="w-9 h-9 rounded-full bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center transition-all duration-200 shrink-0"
      >
        {isPlaying ? (
          <PauseIcon size={14} className="text-blue-400" />
        ) : (
          <PlayIcon size={14} className="text-blue-400 ml-0.5" />
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <canvas
          ref={canvasRef}
          className="w-full h-8 cursor-pointer rounded"
          onClick={handleCanvasClick}
        />
        <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
          <span>{formatTime(audioRef.current?.currentTime)}</span>
          <span>{formatTime(audioRef.current?.duration)}</span>
        </div>
      </div>
    </div>
  );
}

function LiveWaveform({ stream }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!stream) return;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, w, h);

      const barCount = 30;
      const barWidth = (w / barCount) * 0.6;
      const gap = (w / barCount) * 0.4;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const val = dataArray[dataIndex] / 255;
        const barH = Math.max(val * h * 0.85, 3);
        const y = (h - barH) / 2;

        const intensity = val;
        ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + intensity * 0.6})`;

        ctx.beginPath();
        ctx.roundRect(i * (barWidth + gap), y, barWidth, barH, 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} className="w-full h-8 rounded" />;
}

export default function AudioRecorder({ onSend, onDiscard, disabled, autoStart }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const hasAutoStarted = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => () => cleanup(), [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } catch (err) {
      console.error('Mic access denied:', err);
      if (onDiscard) onDiscard(); // Go back to text if mic denied
    }
  }, [onDiscard]);

  // Auto-start recording when mounted with autoStart prop
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startRecording();
    }
  }, [autoStart, startRecording]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const discard = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    // Stop recording if still active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsed(0);
    setIsPlaying(false);
    setRecording(false);
    if (onDiscard) onDiscard();
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob);
      setAudioBlob(null);
      setAudioUrl(null);
      setElapsed(0);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Preview state with waveform
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-3 bg-gray-700/50 backdrop-blur-sm rounded-2xl px-4 py-3 w-full animate-fade-in border border-gray-600/30">
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
        <WaveformPreview
          audioUrl={audioUrl}
          audioRef={audioRef}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={discard}
            disabled={disabled}
            className="w-9 h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all duration-200 disabled:opacity-50 group"
            title="Discard"
          >
            <FiTrash2 className="w-4 h-4 text-red-400 group-hover:text-red-300" />
          </button>
          <button
            onClick={handleSend}
            disabled={disabled}
            className="w-9 h-9 rounded-full bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-all duration-200 disabled:opacity-50 group"
            title="Send"
          >
            <FiSend className="w-4 h-4 text-green-400 group-hover:text-green-300" />
          </button>
        </div>
      </div>
    );
  }

  // Recording state with live waveform
  if (recording) {
    return (
      <div className="flex items-center gap-3 bg-red-950/30 backdrop-blur-sm rounded-2xl px-4 py-3 w-full animate-fade-in border border-red-500/20">
        <button
          onClick={stopRecording}
          disabled={disabled}
          className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-200 disabled:opacity-50 shrink-0 shadow-lg shadow-red-500/25"
          title="Stop recording"
        >
          <FiSquare className="w-4 h-4 text-white fill-white" />
        </button>
        <div className="flex-1">
          <LiveWaveform stream={streamRef.current} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-mono text-red-400 tabular-nums">
            {formatTime(elapsed)}
          </span>
          <button
            onClick={discard}
            disabled={disabled}
            className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all duration-200 disabled:opacity-50 group"
            title="Cancel"
          >
            <FiTrash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
          </button>
        </div>
      </div>
    );
  }

  // Fallback: should not be visible since autoStart triggers recording immediately
  return null;
}