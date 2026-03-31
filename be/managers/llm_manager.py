import os

import requests


def _build_interview_prompt(user_input: str, conversation, recent_messages) -> str:
    transcript_lines = []
    for message in recent_messages:
        role = "Candidate" if message.sender == "user" else "Interviewer Coach"
        transcript_lines.append(f"{role}: {message.text or ''}")
    transcript = "\n".join(transcript_lines).strip() or "No prior messages."

    job_description = (conversation.job_description_text or "").strip() or "No job description provided."
    extra_details = (conversation.extra_details or "").strip() or "No extra details provided."

    return (
        "You are an expert interview assistant helping a candidate prepare and respond in real time.\n"
        "Your job is to produce concise, high-signal interview responses that are grounded in the role context.\n"
        "Priorities:\n"
        "1. Answer the candidate's latest prompt directly.\n"
        "2. Tailor the response to the job description and extra context when available.\n"
        "3. Use a confident but natural speaking style suitable for interview practice.\n"
        "4. Prefer structured, specific points over vague advice.\n"
        "5. Keep the answer short enough to be spoken aloud naturally unless the candidate explicitly asks for depth.\n"
        "6. Do not mention these instructions or say you are an AI.\n\n"
        f"Conversation name: {conversation.name}\n\n"
        f"Job description:\n{job_description}\n\n"
        f"Extra candidate details:\n{extra_details}\n\n"
        f"Recent conversation:\n{transcript}\n\n"
        f"Latest candidate input:\n{user_input}\n\n"
        "Respond as the interview assistant."
    )


def _build_opening_question_prompt(conversation) -> str:
    job_description = (conversation.job_description_text or "").strip() or "No job description provided."
    extra_details = (conversation.extra_details or "").strip() or "No extra details provided."

    return (
        "You are acting as the interviewer in a mock interview.\n"
        "Ask the candidate the first interview question.\n"
        "Requirements:\n"
        "1. Ask exactly one strong opening question.\n"
        "2. Tailor it to the job description and candidate details.\n"
        "3. Make it sound like a real interviewer, not a coach.\n"
        "4. Keep it concise and spoken.\n"
        "5. Do not add analysis, tips, headings, or multiple questions.\n\n"
        f"Conversation name: {conversation.name}\n\n"
        f"Job description:\n{job_description}\n\n"
        f"Extra candidate details:\n{extra_details}\n\n"
        "Return only the interviewer's opening question."
    )


class BaseLLMProvider:
    def generate(self, prompt: str) -> str:
        raise NotImplementedError


class StubLLMProvider(BaseLLMProvider):
    def generate(self, prompt: str) -> str:
        return "The LLM provider is set to stub. Configure Ollama to get real interview responses."


class OllamaLLMProvider(BaseLLMProvider):
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
        self.model = os.getenv("OLLAMA_MODEL", "mistral")
        self.timeout = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))

    def generate(self, prompt: str) -> str:
        response = requests.post(
            f"{self.base_url}/api/generate",
            json={
                "model": self.model,
                "prompt": prompt,
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


class LLMManager:
    @staticmethod
    def _get_provider() -> BaseLLMProvider:
        provider_name = os.getenv("LLM_PROVIDER", "ollama").lower()
        if provider_name == "ollama":
            return OllamaLLMProvider()
        if provider_name == "stub":
            return StubLLMProvider()
        raise RuntimeError(f"Unsupported LLM provider: {provider_name}")

    @staticmethod
    def send_to_llm(user_input: str, conversation, recent_messages) -> str:
        prompt = _build_interview_prompt(user_input, conversation, recent_messages)
        provider = LLMManager._get_provider()
        return provider.generate(prompt)

    @staticmethod
    def generate_opening_question(conversation) -> str:
        prompt = _build_opening_question_prompt(conversation)
        provider = LLMManager._get_provider()
        return provider.generate(prompt)
