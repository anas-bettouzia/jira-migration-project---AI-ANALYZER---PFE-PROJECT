import { api } from '../core/api';

export interface TranslateResponse {
  text: string;
  used_ai?: boolean;
  error?: string;
}

export const translateText = async (
  text: string,
  targetLocale: 'en' | 'fr',
  sourceLocale?: 'en' | 'fr',
): Promise<string> => {
  if (!text.trim() || targetLocale === sourceLocale) {
    return text;
  }

  const response = await api.post<TranslateResponse>('/translate', {
    text,
    target_locale: targetLocale,
    source_locale: sourceLocale ?? 'en',
  });

  return response.data.text || text;
};
