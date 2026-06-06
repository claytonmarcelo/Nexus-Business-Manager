import api from './api';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  suggestions?: string[];
}

export interface ChatResponse {
  answer: string;
  source: 'rules' | 'ollama' | 'fallback';
  suggestions: string[];
}

export interface InsightData {
  type: string;
  title: string;
  message: string;
  severity: 'success' | 'warning' | 'danger' | 'info';
}

export interface AnalyzeResponse {
  summary: string;
  risks?: string[];
  opportunities?: string[];
  recommendedActions?: string[];
  source: string;
}

export async function sendChatMessage(message: string, module?: string, page?: string): Promise<ChatResponse> {
  const res = await api.post('/ai/chat', { message, module, page });
  return res.data;
}

export async function getSuggestions(module?: string): Promise<string[]> {
  const res = await api.get('/ai/suggestions', { params: { module } });
  return res.data.data || [];
}

export async function getInsights(): Promise<InsightData[]> {
  const res = await api.get('/ai/insights');
  return res.data.data || [];
}

export async function getHelp(module: string) {
  const res = await api.get(`/ai/help/${module}`);
  return res.data.data;
}

export async function analyzeModule(module: string, period: string = 'month'): Promise<AnalyzeResponse> {
  const res = await api.post('/ai/analyze', { module, period });
  return res.data;
}
