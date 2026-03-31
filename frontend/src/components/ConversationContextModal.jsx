import React, { useEffect, useRef, useState } from 'react';

export default function ConversationContextModal({
  theme = 'dark',
  open,
  title,
  submitLabel,
  conversation,
  initialValues,
  onClose,
  onSave,
  onExtractJobDescription,
  onError,
  loading,
  readOnly,
}) {
  const [name, setName] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [interactionMode, setInteractionMode] = useState('text');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerTotalMinutes, setTimerTotalMinutes] = useState('');
  const [file, setFile] = useState(null);
  const previousOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !previousOpenRef.current;
    previousOpenRef.current = open;

    if (!open || !justOpened) {
      return;
    }

    const source = conversation || initialValues || {};
    setName(source.name || '');
    setJobDescriptionText(source.job_description_text || source.jobDescriptionText || '');
    setExtraDetails(source.extra_details || source.extraDetails || '');
    setInteractionMode(source.interaction_mode || source.interactionMode || 'text');
    setTimerEnabled(Boolean(source.timer_enabled ?? source.timerEnabled ?? false));
    setTimerTotalMinutes(
      source.timer_total_seconds
        ? String(Math.floor(source.timer_total_seconds / 60))
        : String(source.timerTotalMinutes || 30)
    );
    setFile(null);
  }, [open, conversation, initialValues]);

  if (!open) {
    return null;
  }

  const hasJobDescriptionText = Boolean(jobDescriptionText.trim());
  const hasSelectedFile = Boolean(file);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      jobDescriptionText: file ? '' : jobDescriptionText,
      extraDetails,
      interactionMode,
      timerEnabled,
      timerTotalMinutes: timerEnabled && timerTotalMinutes ? Number(timerTotalMinutes) : null,
      file,
    });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (!selectedFile) return;

    try {
      const payload = await onExtractJobDescription(selectedFile);
      setJobDescriptionText(payload.text || '');
    } catch (err) {
      onError?.(err.message || 'Could not extract the uploaded job description');
      setFile(null);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm px-4 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-slate-900/20'}`}>
      <div className={`w-full max-w-3xl rounded-[28px] shadow-2xl ${theme === 'dark' ? 'border border-white/10 bg-[#0b1220] shadow-black/40' : 'border border-slate-200 bg-white shadow-slate-300/40'}`}>
        <div className={`flex items-start justify-between gap-4 px-6 py-5 ${theme === 'dark' ? 'border-b border-white/10' : 'border-b border-slate-200'}`}>
          <div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {readOnly
                ? 'Conversation context is locked after the conversation starts.'
                : 'Provide context before starting the conversation.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`rounded-xl px-3 py-2 text-sm ${theme === 'dark' ? 'border border-white/10 text-slate-300 hover:bg-white/5' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className={`text-xs uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Conversation</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={readOnly}
                className={`mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none read-only:opacity-70 ${theme === 'dark' ? 'bg-slate-950/70 border border-white/10 text-white focus:border-cyan-400/50' : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500/50'}`}
              />
            </label>

            <label className="block">
              <span className={`text-xs uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Job Description File</span>
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                disabled={readOnly || (!hasSelectedFile && hasJobDescriptionText)}
                className={`mt-2 block w-full rounded-2xl px-4 py-3 text-sm disabled:opacity-60 ${theme === 'dark' ? 'bg-slate-950/70 border border-white/10 text-slate-300' : 'bg-white border border-slate-300 text-slate-700'}`}
              />
              <div className={`mt-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                {file
                  ? `Selected: ${file.name}`
                  : 'Accepted formats: .txt, .pdf'}
              </div>
            </label>
          </div>

          <label className="block">
            <span className={`text-xs uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Job Description Text</span>
            <textarea
              value={jobDescriptionText}
              onChange={(e) => setJobDescriptionText(e.target.value)}
              readOnly={readOnly}
              disabled={hasSelectedFile || readOnly}
              rows={6}
              placeholder="Paste the job description here, or upload a .txt/.pdf file to auto-populate it."
              className={`mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none resize-y read-only:opacity-70 disabled:opacity-60 ${theme === 'dark' ? 'bg-slate-950/70 border border-white/10 text-white focus:border-cyan-400/50' : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500/50'}`}
            />
          </label>

          <label className="block">
            <span className={`text-xs uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Extra Details</span>
            <textarea
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              readOnly={readOnly}
              rows={4}
              placeholder="Add resume highlights, interview goals, focus areas, or any extra context for the assistant."
              className={`mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none resize-y read-only:opacity-70 ${theme === 'dark' ? 'bg-slate-950/70 border border-white/10 text-white focus:border-cyan-400/50' : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500/50'}`}
            />
          </label>

          <div className="block">
            <span className={`text-xs uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Practice Mode</span>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {[
                { value: 'text', label: 'Text Mode', description: 'Current text-first practice flow.' },
                { value: 'audio', label: 'Audio Mode', description: 'Voice-only candidate input.' },
                { value: 'video', label: 'Video Mode', description: 'Coming later.', disabled: true },
              ].map((mode) => {
                const active = interactionMode === mode.value;
                return (
                  <label
                    key={mode.value}
                    className={`rounded-2xl border px-4 py-4 ${
                      mode.disabled
                        ? theme === 'dark'
                          ? 'border-white/5 bg-slate-950/40 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                        : active
                          ? 'border-cyan-400/40 bg-cyan-400/10'
                          : theme === 'dark'
                            ? 'border-white/10 bg-slate-950/50'
                            : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="interactionMode"
                      value={mode.value}
                      checked={active}
                      disabled={readOnly || mode.disabled}
                      onChange={(e) => setInteractionMode(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{mode.label}</div>
                    <div className={`mt-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{mode.description}</div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            <label className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${theme === 'dark' ? 'border border-white/10 bg-slate-950/50' : 'border border-slate-300 bg-slate-50'}`}>
              <input
                type="checkbox"
                checked={timerEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setTimerEnabled(enabled);
                  if (enabled && !timerTotalMinutes) {
                    setTimerTotalMinutes('30');
                  }
                }}
                disabled={readOnly}
                className="h-4 w-4 accent-cyan-400 disabled:opacity-60"
              />
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Enable timer</span>
            </label>

            <label className="block">
              <span className={`text-xs uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Timer Duration (Minutes)</span>
              <input
                type="number"
                min="1"
                max="180"
                step="1"
                value={timerTotalMinutes}
                onChange={(e) => setTimerTotalMinutes(e.target.value)}
                disabled={readOnly || !timerEnabled}
                placeholder="Minutes"
                className={`mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none disabled:opacity-50 ${theme === 'dark' ? 'bg-slate-950/70 border border-white/10 text-white focus:border-cyan-400/50' : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500/50'}`}
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              Use either a JD file or pasted JD text. Extra details are optional, but some context is required before chat starts. Timers can be set up to 180 minutes.
            </div>
            {!readOnly ? (
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 disabled:opacity-50"
              >
                {loading ? 'Creating practice interview...' : submitLabel}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
