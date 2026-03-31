const API_BASE = (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function toAbsoluteApiUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

function buildHeaders(token, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readJson(res, fallbackMessage) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.detail || fallbackMessage);
  }
  return data;
}

function normalizeAssistantResponse(payload) {
  if (payload.audio_path) {
    return {
      type: 'audio',
      content: toAbsoluteApiUrl(payload.audio_path),
      text: payload.text || '',
      audioPath: payload.audio_path,
      userText: payload.user_text || '',
    };
  }

  return {
    type: 'text',
    content: payload.text || '',
    text: payload.text || '',
    audioPath: '',
    userText: payload.user_text || '',
  };
}

export function mapMessage(message) {
  return {
    id: message.id,
    sender: message.sender,
    type: message.audio_path ? 'audio' : (message.type || message.message_type || 'text'),
    content: message.audio_path ? toAbsoluteApiUrl(message.audio_path) : (message.text || ''),
    text: message.text || '',
    audioPath: message.audio_path ? toAbsoluteApiUrl(message.audio_path) : '',
    timestamp: message.created_at || Date.now(),
  };
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return readJson(res, 'Login failed');
}

export async function fetchCurrentUser(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: buildHeaders(token),
  });
  return readJson(res, 'Could not fetch current user');
}

export async function logout(token) {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: buildHeaders(token),
  });
  return readJson(res, 'Logout failed');
}

export async function listConversations(token) {
  const res = await fetch(`${API_BASE}/conversations`, {
    headers: buildHeaders(token),
  });
  return readJson(res, 'Could not load conversations');
}

export async function createConversation(name, token) {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  });
  return readJson(res, 'Could not create conversation');
}

export async function updateConversationContext(conversationId, payload, token) {
  const formData = new FormData();
  if (payload.name !== undefined) formData.append('name', payload.name);
  if (payload.jobDescriptionText !== undefined && !payload.file) formData.append('job_description_text', payload.jobDescriptionText);
  if (payload.extraDetails !== undefined) formData.append('extra_details', payload.extraDetails);
  if (payload.interactionMode !== undefined) formData.append('interaction_mode', payload.interactionMode);
  if (payload.timerEnabled !== undefined) formData.append('timer_enabled', String(payload.timerEnabled));
  if (payload.timerTotalMinutes !== undefined && payload.timerTotalMinutes !== null) {
    formData.append('timer_total_minutes', String(payload.timerTotalMinutes));
  }
  if (payload.file) formData.append('file', payload.file);

  const res = await fetch(`${API_BASE}/conversations/${conversationId}/context`, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: formData,
  });
  return readJson(res, 'Could not update conversation context');
}

export async function extractJobDescription(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/conversations/job-description/extract`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: formData,
  });
  return readJson(res, 'Could not extract job description');
}

export async function deleteConversation(conversationId, token) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  });
  return readJson(res, 'Could not delete conversation');
}

export async function pauseInterview(conversationId, token) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/pause`, {
    method: 'POST',
    headers: buildHeaders(token),
  });
  return readJson(res, 'Could not pause practice interview');
}

export async function resumeInterview(conversationId, payload, token) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/resume`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return readJson(res, 'Could not resume practice interview');
}

export async function stopInterview(conversationId, token) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/stop`, {
    method: 'POST',
    headers: buildHeaders(token),
  });
  return readJson(res, 'Could not stop practice interview');
}

export async function fetchConversationMessages(conversationId, token) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    headers: buildHeaders(token),
  });
  const messages = await readJson(res, 'Could not load conversation');
  return messages.map(mapMessage);
}

export async function sendTextMessage(message, conversationId, token) {
  const res = await fetch(`${API_BASE}/text-input`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
  return normalizeAssistantResponse(await readJson(res, 'Text request failed'));
}

export async function sendAudioMessage(audioBlob, conversationId, token) {
  const formData = new FormData();
  formData.append('conversation_id', String(conversationId));
  formData.append('file', audioBlob, 'recording.wav');

  const res = await fetch(`${API_BASE}/audio-input`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: formData,
  });
  return normalizeAssistantResponse(await readJson(res, 'Audio request failed'));
}
