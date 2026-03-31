_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from faster_whisper import WhisperModel
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "faster-whisper is not installed. Audio transcription requires a compatible "
                "speech-to-text environment."
            ) from exc
        _model = WhisperModel("medium", compute_type="int8")
    return _model


def transcribe_audio(file_path: str) -> str:
    try:
        model = _get_model()
        segments, _ = model.transcribe(file_path)
        text_parts = [segment.text for segment in segments]
        combined = " ".join(text_parts).strip()
        return combined if combined else ""
    except Exception as e:
        raise RuntimeError(f"Whisper transcription failed: {e}") from e
