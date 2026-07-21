import { api } from '../core/api';
import { type Language } from '../i18n';

export interface ReportData {
  report_id: string;
  source_filename?: string;
  analysis_name?: string;
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

function readContentDispositionParam(header: string, paramName: string): string | null {
  const prefix = `${paramName.toLowerCase()}=`;
  const part = header
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.toLowerCase().startsWith(prefix));

  if (!part) {
    return null;
  }

  const value = part.slice(part.indexOf('=') + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}

function extractFilenameFromContentDisposition(header?: string): string | null {
  if (!header) {
    return null;
  }

  const encodedFilename = readContentDispositionParam(header, 'filename*');
  if (encodedFilename) {
    const value = encodedFilename.startsWith("UTF-8''")
      ? encodedFilename.slice("UTF-8''".length)
      : encodedFilename;
    return decodeURIComponent(value.trim());
  }

  const filename = readContentDispositionParam(header, 'filename');
  return filename ? decodeURIComponent(filename.trim()) : null;
}

function sanitizeExportBasename(value: string, maxLength = 120): string {
  const filename = value.trim().replaceAll('\\', '/').split('/').pop() ?? value;
  const lastDotIndex = filename.lastIndexOf('.');
  const stem = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  let sanitized = '';
  let previousWasSeparator = false;

  for (const char of stem) {
    const code = char.codePointAt(0) ?? 0;
    const isSafeCharacter = (
      (code >= 48 && code <= 57)
      || (code >= 65 && code <= 90)
      || (code >= 97 && code <= 122)
      || char === '_'
      || char === '-'
    );
    if (isSafeCharacter) {
      sanitized += char;
      previousWasSeparator = false;
    } else if (!previousWasSeparator) {
      sanitized += '_';
      previousWasSeparator = true;
    }
  }

  const trimmed = sanitized
    .split('')
    .filter((char, index, chars) => {
      const isLeadingSeparator = char === '_' && chars.slice(0, index).every((item) => item === '_');
      const isTrailingSeparator = char === '_' && chars.slice(index + 1).every((item) => item === '_');
      return !isLeadingSeparator && !isTrailingSeparator;
    })
    .join('');

  return trimmed.slice(0, maxLength) || 'report';
}

function buildExportFilename(
  reportId: string,
  extension: 'pdf' | 'json',
  sourceFilename?: string,
  language?: string,
): string {
  if (sourceFilename) {
    const base = sanitizeExportBasename(sourceFilename);
    if (base) {
      const prefix = (language || localStorage.getItem('jira-migration-language') || 'en').startsWith('fr')
        ? 'rapport_du_'
        : 'report_of_';
      return `${prefix}${base}.${extension}`;
    }
  }

  return `report_${reportId}.${extension}`;
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
  async listReports(): Promise<{ reports?: Array<{ report_id?: string }> }> {
    const response = await api.get('/reports');
    return response.data;
  },

  /**
   * Télécharge le rapport au format spécifié (pdf ou json)
   */
  async downloadReport(reportId: string, type: 'pdf' | 'json', language?: string) {
    const response = await api.get(`/reports/${reportId}/${type}`, {
      params: language ? { language } : undefined,
      responseType: 'blob',
    });

    const headerFilename = extractFilenameFromContentDisposition(
      response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'],
    );

    let filename = headerFilename || `report_${reportId}.${type}`;
    if (!headerFilename) {
      try {
        const meta = await this.getReport(reportId);
        const raw = typeof meta?.analysis_name === 'string' && meta.analysis_name.trim()
          ? meta.analysis_name
          : typeof meta?.source_filename === 'string'
            ? meta.source_filename
            : undefined;
        filename = buildExportFilename(reportId, type, raw, language);
      } catch {
        // ignore metadata errors and fallback to id-based name
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
