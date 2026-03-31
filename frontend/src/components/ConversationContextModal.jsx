import React, { useEffect, useRef, useState } from 'react';

export default function ConversationContextModal({
  open,
  title,
  submitLabel,
  conversation,
  initialValues,
  onClose,
  onSave,
  onExtractJobDescription,
  loading,
  readOnly,
}) {
  const [name, setName] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
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
    setTimerEnabled(Boolean(source.timer_enabled ?? source.timerEnabled ?? true));
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
      window.alert(err.message || 'Could not extract the uploaded job description');
      setFile(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {readOnly
                ? 'Conversation context is locked after the conversation starts.'
                : 'Provide context before starting the conversation.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Conversation</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={readOnly}
                className="mt-2 w-full rounded-2xl bg-slate-950/70 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50 read-only:opacity-70"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Job Description File</span>
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                disabled={readOnly || (!hasSelectedFile && hasJobDescriptionText)}
                className="mt-2 block w-full rounded-2xl bg-slate-950/70 border border-white/10 px-4 py-3 text-sm text-slate-300 disabled:opacity-60"
              />
              <div className="mt-2 text-xs text-slate-500">
                {file
                  ? `Selected: ${file.name}`
                  : 'Accepted formats: .txt, .pdf'}
              </div>
            </label>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Job Description Text</span>
            <textarea
              value={jobDescriptionText}
              onChange={(e) => setJobDescriptionText(e.target.value)}
              readOnly={readOnly}
              disabled={hasSelectedFile || readOnly}
              rows={6}
              placeholder="Paste the job description here, or upload a .txt/.pdf file to auto-populate it."
              className="mt-2 w-full rounded-2xl bg-slate-950/70 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50 resize-y read-only:opacity-70 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Extra Details</span>
            <textarea
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              readOnly={readOnly}
              rows={4}
              placeholder="Add resume highlights, interview goals, focus areas, or any extra context for the assistant."
              className="mt-2 w-full rounded-2xl bg-slate-950/70 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50 resize-y read-only:opacity-70"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
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
              <span className="text-sm text-slate-200">Enable timer</span>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Timer Duration (Minutes)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={timerTotalMinutes}
                onChange={(e) => setTimerTotalMinutes(e.target.value)}
                disabled={readOnly || !timerEnabled}
                placeholder="Minutes"
                className="mt-2 w-full rounded-2xl bg-slate-950/70 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50 disabled:opacity-50"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Use either a JD file or pasted JD text. Extra details are optional, but some context is required before chat starts.
            </div>
            {!readOnly ? (
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 disabled:opacity-50"
              >
                {loading ? 'Saving...' : submitLabel}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
