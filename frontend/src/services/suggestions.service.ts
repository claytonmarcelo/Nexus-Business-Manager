import api from './api';

export interface CreateSuggestionData {
  title: string;
  description: string;
  category: string;
  accepted_terms: boolean;
}

export interface UpdateSuggestionData {
  status?: string;
  admin_notes?: string | null;
}

export async function listSuggestions(params: { page?: number; limit?: number; search?: string; status?: string; category?: string } = {}) {
  const res = await api.get('/suggestions', { params });
  return res.data;
}

export async function getSuggestionById(id: number) {
  const res = await api.get(`/suggestions/${id}`);
  return res.data;
}

export async function createSuggestion(data: CreateSuggestionData) {
  const res = await api.post('/suggestions', data);
  return res.data;
}

export async function updateSuggestion(id: number, data: UpdateSuggestionData) {
  const res = await api.put(`/suggestions/${id}`, data);
  return res.data;
}

export async function deleteSuggestion(id: number) {
  const res = await api.delete(`/suggestions/${id}`);
  return res.data;
}

export async function getSuggestionStats() {
  const res = await api.get('/suggestions/stats');
  return res.data;
}
