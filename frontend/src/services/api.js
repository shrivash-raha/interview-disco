const API_BASE = '/api';
const USE_MOCK = true; // Set to false when backend is ready

const mockResponses = [
  "That's a great question! In my experience, the key to solving complex problems is breaking them down into smaller, manageable pieces.",
  "I'd approach this by first understanding the requirements, then designing a solution, and finally implementing it step by step.",
  "Great point! Let me think about that... I believe the best approach would be to use a combination of algorithms and data structures.",
  "Thanks for sharing that. Based on what you've described, I'd recommend starting with a prototype and iterating from there.",
  "That's an interesting perspective. I'd add that testing early and often is crucial for maintaining code quality.",
];

function getRandomMockResponse() {
  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

export async function sendTextMessage(message) {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: 'text',
          content: getRandomMockResponse(),
        });
      }, 1000); // Simulate 1s network delay
    });
  }

  const res = await fetch(`${API_BASE}/text-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Text API error: ${res.status}`);
  return res.json();
}

export async function sendAudioMessage(audioBlob) {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: 'text',
          content: `[Mock] I received your audio (${(audioBlob.size / 1024).toFixed(1)} KB). Here's my response: ${getRandomMockResponse()}`,
        });
      }, 1500); // Simulate 1.5s network delay
    });
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
  const res = await fetch(`${API_BASE}/audio-response`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Audio API error: ${res.status}`);
  return res.json();
}