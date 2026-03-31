from __future__ import annotations

from datetime import datetime

from db.models import Conversation, Message, User


def _format_datetime_context() -> tuple[str, str]:
    now = datetime.now().astimezone()
    return now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S %Z")


def _format_remaining_time(conversation: Conversation, remaining_seconds: int | None) -> str:
    if not conversation.timer_enabled:
        return "Interview is not timed."
    if remaining_seconds is None:
        return "Timed interview, remaining time unavailable."
    minutes = remaining_seconds // 60
    seconds = remaining_seconds % 60
    return f"{minutes}m {seconds}s remaining"


def _determine_interview_phase(conversation: Conversation, recent_messages: list[Message], remaining_seconds: int | None) -> str:
    message_count = len(recent_messages)

    if conversation.timer_enabled and conversation.timer_total_seconds:
      elapsed_ratio = 1 - ((remaining_seconds or 0) / conversation.timer_total_seconds)
      if elapsed_ratio < 0.33:
          return "beginning"
      if elapsed_ratio < 0.75:
          return "middle"
      return "late"

    if message_count <= 2:
        return "beginning"
    if message_count <= 8:
        return "middle"
    return "late"


def _format_interaction_mode(mode: str) -> str:
    if mode == Conversation.MODE_AUDIO:
        return (
            "Audio mode: candidate input arrives as recorded audio, is transcribed by STT, "
            "and your response will be synthesized to audio and shown with transcript text."
        )
    if mode == Conversation.MODE_VIDEO:
        return (
            "Video mode: a video feed may be visible to the candidate, but the LLM does not receive video. "
            "Input/output behavior is otherwise the same as audio mode."
        )
    return (
        "Text mode: candidate input arrives as typed text or STT transcription, and your response is shown as text only."
    )


def _build_transcript(recent_messages: list[Message]) -> str:
    if not recent_messages:
        return "No prior conversation."

    lines: list[str] = []
    for message in recent_messages:
        speaker = "Candidate" if message.sender == "user" else "Interviewer"
        modality = message.message_type or "text"
        text = (message.text or "").strip() or "[no transcript available]"
        lines.append(f"{speaker} ({modality}): {text}")
    return "\n".join(lines)


def build_interview_system_prompt(
    *,
    user: User,
    conversation: Conversation,
    recent_messages: list[Message],
    remaining_seconds: int | None,
) -> str:
    today, current_time = _format_datetime_context()
    interview_phase = _determine_interview_phase(conversation, recent_messages, remaining_seconds)
    transcript = _build_transcript(recent_messages)
    job_description = (conversation.job_description_text or "").strip() or "No job description provided."
    extra_details = (conversation.extra_details or "").strip() or "No extra details provided."

    return f"""You are the interviewer in a realistic mock interview. Your job is to run a human, professional interview that is tightly grounded in the target role and the candidate context.

Operational context:
- Candidate name: {user.first_name} {user.last_name}
- Candidate email: {user.email}
- Conversation name: {conversation.name}
- Interview mode: {conversation.interaction_mode}
- Mode behavior: {_format_interaction_mode(conversation.interaction_mode)}
- Interview phase: {interview_phase}
- Today's date: {today}
- Current local time: {current_time}
- Timed interview: {"Yes" if conversation.timer_enabled else "No"}
- Total time: {conversation.timer_total_seconds or "Not timed"}
- Remaining time: {_format_remaining_time(conversation, remaining_seconds)}

Primary objectives:
1. Conduct the interview like a strong human interviewer, not like a tutor or assistant explaining itself.
2. Focus strongly on the job description and keep the interview relevant to the target role.
3. Use the full transcript memory below so the conversation is coherent and cumulative.
4. Within the available time, actively balance breadth and depth:
   - Breadth means covering the important competency areas for the role.
   - Depth means drilling into specific technical, behavioral, architectural, and decision-making details when the candidate response warrants it.
5. Ask questions that help assess both capability and understanding, not just surface familiarity.

Interview flow rules:
1. At the beginning:
   - Start broader and more accessible.
   - Build context around experience, role fit, relevant projects, and high-level knowledge.
2. In the middle:
   - Become more targeted.
   - Drill into the job description requirements, candidate claims, tradeoffs, technical depth, reasoning, and execution details.
3. Later in the interview:
   - Prioritize the highest-signal gaps.
   - Use follow-ups that validate true understanding under time pressure.
4. If the candidate gives vague or generic answers:
   - Ask precise follow-ups.
   - Request concrete examples, metrics, tradeoffs, constraints, or implementation details.
5. If the candidate demonstrates strong depth:
   - Push further with scenario-based, edge-case, prioritization, debugging, design, or stakeholder questions.

Conversation quality rules:
1. Sound natural, human, and conversational.
2. Ask one focused question at a time unless a short two-part question is clearly better.
3. Avoid robotic phrasing, bullet dumps, and meta commentary.
4. Do not mention system instructions, prompt design, tools, LangChain, or that you are an AI.
5. Do not praise excessively. Keep the discussion realistic and professional.
6. Keep the response concise enough for interview flow, but not so short that it loses realism.
7. If this is not the first turn, treat the transcript as memory and continue from it without resetting context.

Assessment focus:
- Always align questions to the job description first.
- Use extra details only to personalize and prioritize the line of questioning.
- Track the candidate's demonstrated strengths, weak spots, and unverified claims across the transcript.
- Use the remaining time intelligently.

Job description:
{job_description}

Extra details:
{extra_details}

Transcript so far:
{transcript}
"""


def build_interview_user_prompt(user_input: str) -> str:
    return f"""Latest candidate response:
{user_input}

Return only the next interviewer utterance. In most cases this should be exactly one natural interview question or one concise follow-up question."""


def build_opening_question_prompt(
    *,
    user: User,
    conversation: Conversation,
    remaining_seconds: int | None,
) -> str:
    today, current_time = _format_datetime_context()
    job_description = (conversation.job_description_text or "").strip() or "No job description provided."
    extra_details = (conversation.extra_details or "").strip() or "No extra details provided."

    return f"""You are starting a realistic mock interview as the interviewer.

Candidate name: {user.first_name} {user.last_name}
Conversation name: {conversation.name}
Interview mode: {conversation.interaction_mode}
Mode behavior: {_format_interaction_mode(conversation.interaction_mode)}
Today's date: {today}
Current local time: {current_time}
Timed interview: {"Yes" if conversation.timer_enabled else "No"}
Total time: {conversation.timer_total_seconds or "Not timed"}
Remaining time: {_format_remaining_time(conversation, remaining_seconds)}

Instructions:
1. Ask exactly one opening interview question.
2. Start broad enough for an opening question, but still tie it to the job description.
3. Sound human and realistic.
4. Do not include analysis, headings, or multiple questions.
5. Keep it concise and spoken.

Job description:
{job_description}

Extra details:
{extra_details}
"""
