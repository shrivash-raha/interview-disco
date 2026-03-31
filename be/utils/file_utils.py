import os
from datetime import datetime

MEDIA_DIR = "media"
LEGACY_AUDIO_RECORDINGS_DIR = "audio_recordings"
LEGACY_TTS_OUTPUTS_DIR = "tts_outputs"
JOB_DESCRIPTION_FILES_DIR = "job_descriptions"


def ensure_directories():
    os.makedirs(MEDIA_DIR, exist_ok=True)
    os.makedirs(LEGACY_AUDIO_RECORDINGS_DIR, exist_ok=True)
    os.makedirs(LEGACY_TTS_OUTPUTS_DIR, exist_ok=True)
    os.makedirs(JOB_DESCRIPTION_FILES_DIR, exist_ok=True)


def _ensure_media_dir(sender: str, user_id: int, conversation_id: int) -> str:
    directory = os.path.join(MEDIA_DIR, sender, str(user_id), str(conversation_id))
    os.makedirs(directory, exist_ok=True)
    return directory


def generate_audio_recording_path(user_id: int, conversation_id: int, extension: str = "webm") -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"recording_{timestamp}.{extension}"
    return os.path.join(_ensure_media_dir("user", user_id, conversation_id), filename)


def generate_tts_output_path(user_id: int, conversation_id: int, extension: str = "mp3") -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"tts_{timestamp}.{extension}"
    return os.path.join(_ensure_media_dir("assistant", user_id, conversation_id), filename)


def generate_job_description_path(extension: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"job_description_{timestamp}.{extension}"
    return os.path.join(JOB_DESCRIPTION_FILES_DIR, filename)


def generate_job_description_file_path(user_id: int, conversation_id: int, file_name: str) -> str:
    directory = os.path.join(JOB_DESCRIPTION_FILES_DIR, str(user_id), str(conversation_id))
    os.makedirs(directory, exist_ok=True)
    return os.path.join(directory, file_name)
