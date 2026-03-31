from __future__ import annotations

from configparser import ConfigParser
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


CONFIG_PATH = Path(__file__).resolve().parent / "config.ini"


def _get_bool(parser: ConfigParser, section: str, option: str, fallback: bool) -> bool:
    if parser.has_option(section, option):
        return parser.getboolean(section, option)
    return fallback


def _get_int(parser: ConfigParser, section: str, option: str, fallback: int) -> int:
    if parser.has_option(section, option):
        return parser.getint(section, option)
    return fallback


def _get_float(parser: ConfigParser, section: str, option: str, fallback: float) -> float:
    if parser.has_option(section, option):
        return parser.getfloat(section, option)
    return fallback


def _get_str(parser: ConfigParser, section: str, option: str, fallback: str) -> str:
    if parser.has_option(section, option):
        return parser.get(section, option).strip()
    return fallback


@dataclass(frozen=True)
class LLMConfig:
    force_temp_response: bool
    temp_response_text: str
    provider: str
    backend: str
    ollama_base_url: str
    ollama_model: str
    openai_model: str
    temperature: float
    timeout_seconds: float
    history_strategy: str
    recent_history_limit: int


@dataclass(frozen=True)
class STTConfig:
    provider: str
    model: str
    compute_type: str


@dataclass(frozen=True)
class TTSConfig:
    provider: str
    voice: str


@dataclass(frozen=True)
class AppConfig:
    llm: LLMConfig
    stt: STTConfig
    tts: TTSConfig


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    parser = ConfigParser()
    parser.read(CONFIG_PATH)

    llm = LLMConfig(
        force_temp_response=_get_bool(parser, "llm", "force_temp_response", True),
        temp_response_text=_get_str(parser, "llm", "temp_response_text", "This is a temp question."),
        provider=_get_str(parser, "llm", "provider", "ollama").lower(),
        backend=_get_str(parser, "llm", "backend", "langchain").lower(),
        ollama_base_url=_get_str(parser, "llm", "ollama_base_url", "http://127.0.0.1:11434").rstrip("/"),
        ollama_model=_get_str(parser, "llm", "ollama_model", "mistral"),
        openai_model=_get_str(parser, "llm", "openai_model", "gpt-4o-mini"),
        temperature=_get_float(parser, "llm", "temperature", 0.4),
        timeout_seconds=_get_float(parser, "llm", "timeout_seconds", 120.0),
        history_strategy=_get_str(parser, "llm", "history_strategy", "full").lower(),
        recent_history_limit=_get_int(parser, "llm", "recent_history_limit", 8),
    )

    stt = STTConfig(
        provider=_get_str(parser, "stt", "provider", "faster_whisper").lower(),
        model=_get_str(parser, "stt", "model", "medium"),
        compute_type=_get_str(parser, "stt", "compute_type", "int8"),
    )

    tts = TTSConfig(
        provider=_get_str(parser, "tts", "provider", "edge_tts").lower(),
        voice=_get_str(parser, "tts", "voice", "en-US-AriaNeural"),
    )

    return AppConfig(llm=llm, stt=stt, tts=tts)
