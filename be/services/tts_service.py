import edge_tts
from utils.file_utils import generate_tts_output_path

VOICE = "en-US-AriaNeural"


async def synthesize_speech(text: str, user_id: int, conversation_id: int) -> str:
    try:
        output_path = generate_tts_output_path(user_id, conversation_id)
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(output_path)
        return output_path
    except Exception as e:
        raise RuntimeError(f"TTS synthesis failed: {e}") from e
