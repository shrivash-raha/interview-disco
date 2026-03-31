import os
from datetime import datetime

MEDIA_DIR = "media"
LEGACY_AUDIO_RECORDINGS_DIR = "audio_recordings"
LEGACY_TTS_OUTPUTS_DIR = "tts_outputs"


def ensure_directories():
    os.makedirs(MEDIA_DIR, exist_ok=True)
    os.makedirs(LEGACY_AUDIO_RECORDINGS_DIR, exist_ok=True)
    os.makedirs(LEGACY_TTS_OUTPUTS_DIR, exist_ok=True)


def _ensure_media_dir(user_id: int, conversation_id: int, *parts: str) -> str:
    directory = os.path.join(MEDIA_DIR, str(user_id), str(conversation_id), *parts)
    os.makedirs(directory, exist_ok=True)
    return directory


def generate_audio_recording_path(user_id: int, conversation_id: int, extension: str = "webm") -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"user_audio_recording_{timestamp}.{extension}"
    return os.path.join(_ensure_media_dir(user_id, conversation_id), filename)


def generate_tts_output_path(user_id: int, conversation_id: int, extension: str = "mp3") -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"assistant_audio_recording_{timestamp}.{extension}"
    return os.path.join(_ensure_media_dir(user_id, conversation_id), filename)


def generate_job_description_file_path(user_id: int, conversation_id: int, file_name: str) -> str:
    directory = _ensure_media_dir(user_id, conversation_id, "job_description")
    return os.path.join(directory, file_name)
