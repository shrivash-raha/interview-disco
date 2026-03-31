import requests

from config import get_config
from db.models import Conversation, Message, User
from managers.conversation_manager import ConversationManager
from prompts.interview_prompt import (
    build_interview_system_prompt,
    build_interview_user_prompt,
    build_opening_question_prompt,
)

class BaseLLMProvider:
    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError


class StubLLMProvider(BaseLLMProvider):
    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        return "The LLM provider is set to stub. Configure Ollama to get real interview responses."


class RequestsOllamaProvider(BaseLLMProvider):
    def __init__(self):
        config = get_config()
        self.base_url = config.llm.ollama_base_url
        self.model = config.llm.ollama_model
        self.timeout = config.llm.timeout_seconds

    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        response = requests.post(
            f"{self.base_url}/api/generate",
            json={
                "model": self.model,
                "prompt": f"{system_prompt}\n\n{user_prompt}",
                "stream": False,
            },
            timeout=self.timeout,
        )
        if not response.ok:
            raise RuntimeError(f"Ollama request failed with status {response.status_code}: {response.text}")

        data = response.json()
        text = (data.get("response") or "").strip()
        if not text:
            raise RuntimeError("Ollama returned an empty response")
        return text


class LangChainOllamaProvider(BaseLLMProvider):
    def __init__(self):
        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_ollama import ChatOllama
        except ImportError as exc:
            raise RuntimeError(
                "LangChain Ollama dependencies are not installed. "
                "Install langchain-core and langchain-ollama to enable Ollama via LangChain."
            ) from exc

        self._human_message = HumanMessage
        self._system_message = SystemMessage
        config = get_config()
        self.client = ChatOllama(
            model=config.llm.ollama_model,
            base_url=config.llm.ollama_base_url,
            temperature=config.llm.temperature,
        )

    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        response = self.client.invoke(
            [
                self._system_message(content=system_prompt),
                self._human_message(content=user_prompt),
            ]
        )
        text = (getattr(response, "content", "") or "").strip()
        if not text:
            raise RuntimeError("LangChain Ollama returned an empty response")
        return text


class LangChainOpenAIProvider(BaseLLMProvider):
    def __init__(self):
        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_openai import ChatOpenAI
        except ImportError as exc:
            raise RuntimeError(
                "LangChain OpenAI dependencies are not installed. "
                "Install langchain-core and langchain-openai to enable OpenAI via LangChain."
            ) from exc

        self._human_message = HumanMessage
        self._system_message = SystemMessage
        config = get_config()
        self.client = ChatOpenAI(
            model=config.llm.openai_model,
            temperature=config.llm.temperature,
        )

    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        response = self.client.invoke(
            [
                self._system_message(content=system_prompt),
                self._human_message(content=user_prompt),
            ]
        )
        text = (getattr(response, "content", "") or "").strip()
        if not text:
            raise RuntimeError("LangChain OpenAI returned an empty response")
        return text


class LLMManager:
    @staticmethod
    def _use_temp_response() -> bool:
        return get_config().llm.force_temp_response

    @staticmethod
    def _get_provider() -> BaseLLMProvider:
        config = get_config()
        provider_name = config.llm.provider
        provider_backend = config.llm.backend

        if provider_name == "stub":
            return StubLLMProvider()

        if provider_name == "ollama":
            if provider_backend == "requests":
                return RequestsOllamaProvider()
            return LangChainOllamaProvider()

        if provider_name == "openai":
            return LangChainOpenAIProvider()

        raise RuntimeError(f"Unsupported LLM provider: {provider_name}")

    @staticmethod
    def send_to_llm(user_input: str, conversation: Conversation, user: User, recent_messages: list[Message]) -> str:
        config = get_config()
        if LLMManager._use_temp_response():
            return config.llm.temp_response_text

        remaining_seconds = ConversationManager.get_remaining_seconds(conversation)
        system_prompt = build_interview_system_prompt(
            user=user,
            conversation=conversation,
            recent_messages=recent_messages,
            remaining_seconds=remaining_seconds,
        )
        user_prompt = build_interview_user_prompt(user_input)
        provider = LLMManager._get_provider()
        return provider.generate(system_prompt=system_prompt, user_prompt=user_prompt)

    @staticmethod
    def generate_opening_question(conversation: Conversation, user: User) -> str:
        config = get_config()
        if LLMManager._use_temp_response():
            return config.llm.temp_response_text

        remaining_seconds = ConversationManager.get_remaining_seconds(conversation)
        system_prompt = build_opening_question_prompt(
            user=user,
            conversation=conversation,
            remaining_seconds=remaining_seconds,
        )
        user_prompt = "Return only the opening interviewer question."
        provider = LLMManager._get_provider()
        return provider.generate(system_prompt=system_prompt, user_prompt=user_prompt)
