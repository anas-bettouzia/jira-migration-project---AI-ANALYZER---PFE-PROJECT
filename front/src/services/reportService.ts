import { api } from '../core/api';

export interface ReportData {
  report_id: string;
  summary?: string; // Résumé texte exécutif
  statistics?: {
    migration_score?: number;
    blocker_count?: number;
    total_components?: number;
    migration_recommendation?: string;
    security_status?: string;
    major_count?: number;
    minor_count?: number;
    info_count?: number;
    incompatible_count?: number;
    partial_count?: number;
    compatible_count?: number;
    needs_review_count?: number;
  };
  migration_score?: number;
  blocker_count?: number;
  total_components?: number;
  migration_recommendation?: string;
  security_status?: string;
  details?: unknown;
  sections?: ReportSections;
  ai_insights?: string;
  ai_summary?: string;
  ai_used?: boolean;
  ai_error?: string;
  ai_model?: string;
  analysis_id?: string;
  matrix_id?: string;
  [key: string]: unknown; // Accepter d'autres champs
}

export interface ReportComponent {
  component_id?: string;
  component_name?: string;
  component_type?: string;
  plugin?: string;
  location?: Record<string, unknown>;
  final_status?: string;
  final_risk?: string;
  risk_level?: string;
  overall_status?: string;
  confidence?: number;
  reasoning_summary?: string;
  recommended_action?: string;
  features_analyzed?: Array<string | { feature?: string }>;
}

export interface ReportRecommendation {
  priority?: string;
  component_id?: string;
  component_name?: string;
  status?: string;
  action?: string;
  reason?: string;
}

export interface ReportSections {
  components?: ReportComponent[];
  blockers?: ReportComponent[];
  recommendations?: ReportRecommendation[];
}

export const reportService = {
  /**
   * Récupère les détails d'un rapport par son ID
   */
  async getReport(reportId: string): Promise<ReportData> {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },

  /**
   * Liste tous les rapports (version courte)
   */
  async listReports() {
    const response = await api.get('/reports');
    return response.data;
  },

  /**
   * Télécharge le rapport au format spécifié (pdf ou json)
   */
  async downloadReport(reportId: string, type: 'pdf' | 'json') {
    const response = await api.get(`/reports/${reportId}/${type}`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${reportId}.${type}`);
    document.body.appendChild(link);
    link.click();
    
    // Nettoyage
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
