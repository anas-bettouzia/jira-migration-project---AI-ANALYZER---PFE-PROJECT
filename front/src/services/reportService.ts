import { api } from '../core/api';
import { type Language } from '../i18n';

export interface ReportData {
  report_id: string;
  source_filename?: string;
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
  ai_summary_fr?: string;
  ai_used?: boolean;
  ai_error?: string;
  ai_model?: string;
  translations?: Partial<Record<Language, {
    ai_summary?: string;
    migration_recommendation?: string;
    ai_insights?: string;
    ai_error?: string;
    details?: unknown;
    sections?: {
      components?: Array<{
        component_id?: string;
        reasoning_summary?: string;
        recommended_action?: string;
      }>;
      blockers?: Array<{
        component_id?: string;
        reasoning_summary?: string;
        recommended_action?: string;
      }>;
      recommendations?: Array<{
        component_id?: string;
        action?: string;
        reason?: string;
      }>;
    };
  }>>;
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
   * Request a translated version (cached) of the report AI summary.
   * Returns object with ai_summary_fr and used_ai flag when available.
   */
  async translateReport(reportId: string, target = 'fr') {
    const response = await api.post(`/reports/${reportId}/translate`, { target_language: target });
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
    // Try to fetch report metadata to create a nicer filename
    let niceBase = `report_${reportId}`;
    try {
      const meta = await this.getReport(reportId);
      const raw = typeof meta?.source_filename === 'string' ? meta.source_filename : undefined;
      if (raw) {
        // take last path segment and strip extension
        const last = raw.split(/\\|\//).pop() ?? raw;
        const stem = last.replace(/\.[^.]+$/, '');
        // sanitize: replace spaces and non-word chars with underscore
        const sanitized = stem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 120);
        // detect current UI language (default to en)
        const uiLang = (localStorage.getItem('jira-migration-language') as string) || 'en';
        niceBase = uiLang === 'fr' ? `rapport_du_${sanitized}` : `report_of_${sanitized}`;
      }
    } catch (err) {
      // ignore metadata errors and fallback to id-based name
      // console.debug('Unable to fetch report metadata for filename', err);
    }

    const response = await api.get(`/reports/${reportId}/${type}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${niceBase}.${type}`);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
