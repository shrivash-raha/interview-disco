import edge_tts
from config import get_config
from utils.file_utils import generate_tts_output_path


async def synthesize_speech(text: str, user_id: int, conversation_id: int) -> str:
    try:
        config = get_config()
        if config.tts.provider != "edge_tts":
            raise RuntimeError(f"Unsupported TTS provider: {config.tts.provider}")
        output_path = generate_tts_output_path(user_id, conversation_id)
        communicate = edge_tts.Communicate(text, config.tts.voice)
        await communicate.save(output_path)
        return output_path
    except Exception as e:
        raise RuntimeError(f"TTS synthesis failed: {e}") from e
