from services.whisper_service import transcribe_audio


class STTManager:
    @staticmethod
    def convert_audio_to_text(audio_path: str) -> str:
        text = transcribe_audio(audio_path)
        if not text:
            raise ValueError("Transcription returned empty text")
        return text
