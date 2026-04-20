// src/services/chatbotService.ts
import { BASE_URL, API_ENDPOINTS } from '../constants/api';
import { ChatTurn } from '../types/chatbot';

export const chatbotService = {
  /**
   * Stream a chat response from the backend.
   * @param message The user's query
   * @param history Prior turns for context
   * @param onChunk Callback for each streamed chunk of text
   * @param onComplete Callback when the stream is finished
   * @param onError Callback for errors
   */
  streamChat: async (
    message: string,
    history: ChatTurn[],
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: any) => void
  ) => {
    const token = localStorage.getItem('accessToken');
    const url = `${BASE_URL}${API_ENDPOINTS.CHATBOT.CHAT}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          conversation_history: history,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to connect to FinBot');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Split by SSE data markers
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the incomplete last line in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            onChunk(data);
          }
        }
      }
    } catch (error) {
      onError(error);
    }
  },
};
