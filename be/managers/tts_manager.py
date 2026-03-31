from services.tts_service import synthesize_speech


class TTSManager:
    @staticmethod
    async def convert_text_to_audio(text: str, user_id: int, conversation_id: int) -> str:
        audio_path = await synthesize_speech(text, user_id, conversation_id)
        return audio_path
