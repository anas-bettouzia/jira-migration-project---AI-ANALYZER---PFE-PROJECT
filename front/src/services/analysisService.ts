import { api } from '../core/api';

export const analysisService = {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    // On utilise l'instance axios qui a déjà le token et la bonne baseURL
    const response = await api.post('/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getJobStatus(jobId: string) {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  }
};