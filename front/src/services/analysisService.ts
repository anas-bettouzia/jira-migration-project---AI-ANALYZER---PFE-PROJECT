import { api } from '../core/api';

export interface AnalysisJob {
  job_id: string;
  status?: string;
  job_type?: string;
  payload?: {
    filename?: string;
    analysis_name?: string;
    [key: string]: unknown;
  };
  result?: {
    report_id?: string;
    analysis_id?: string;
    summary?: {
      migration_score?: number;
      blocker_count?: number;
      total_components?: number;
    };
    [key: string]: unknown;
  };
  created_at?: string;
  updated_at?: string;
  error?: string;
  [key: string]: unknown;
}

export const analysisService = {
  async uploadFile(file: File, language?: string, analysisName?: string) {
    const normalizedAnalysisName = analysisName?.trim();

    const formData = new FormData();
    formData.append('file', file);
    if (language) formData.append('language', language);
    if (normalizedAnalysisName) formData.append('analysis_name', normalizedAnalysisName);

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
  },

  async listJobs(limit = 8): Promise<AnalysisJob[]> {
    const response = await api.get('/jobs', { params: { limit } });
    return response.data?.jobs ?? [];
  },

  async deleteReport(reportId: string): Promise<{ message: string }> {
    const response = await api.delete(`/reports/${reportId}`);
    return response.data;
  },

  async archiveReport(reportId: string): Promise<{ message: string; report_id: string }> {
    const response = await api.post(`/reports/${reportId}/archive`);
    return response.data;
  },

  async listArchivedReports(limit = 50) {
    const response = await api.get('/reports/archived', { params: { limit } });
    return response.data;
  }
};
