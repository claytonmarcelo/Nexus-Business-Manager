import { AppError } from '../../shared/errors/app-error';

const AI_ENABLED = process.env.AI_ENABLED !== 'false';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '20000', 10);

export async function askOllama(prompt: string): Promise<string | null> {
  if (!AI_ENABLED) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[NexusAI] Ollama returned status ${response.status}`);
      return null;
    }

    const data = await response.json() as { response?: string };
    return data.response || null;
  } catch (error: any) {
    console.warn(`[NexusAI] Ollama request failed: ${error.message || error}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
