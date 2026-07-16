import React, { useRef, useState } from 'react';
import { CheckCircle2, Info, Loader2, UploadCloud, X } from 'lucide-react';
import { analysisService } from '../../services/analysisService';
import { useI18n } from '../../i18n';

interface FileUploaderProps {
  analysisName?: string;
  onFileSelectionChange?: (hasFile: boolean) => void;
  onUploadSuccess: (jobId: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ analysisName, onFileSelectionChange, onUploadSuccess }) => {
  const { t, language } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [validationPulseKey, setValidationPulseKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFile = Boolean(file);

  const assignFile = (nextFile?: File) => {
    if (!nextFile) return;
    setFile(nextFile);
    setValidationPulseKey((key) => key + 1);
    onFileSelectionChange?.(true);
  };

  const clearFile = () => {
    setFile(null);
    onFileSelectionChange?.(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await analysisService.uploadFile(file, language, analysisName);
      onUploadSuccess(result.job_id);
    } catch {
      alert(t('uploader.uploadError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <style>
        {`
          @keyframes upload-confirm {
            0% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(35, 209, 139, 0.32); }
            55% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(35, 209, 139, 0.12); }
            100% { transform: scale(1); box-shadow: 0 0 0 18px rgba(35, 209, 139, 0); }
          }

          @keyframes checklist-confirm {
            0% { transform: translateY(2px); }
            55% { transform: translateY(-1px); }
            100% { transform: translateY(0); }
          }
        `}
      </style>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#dbe4f2] bg-[#f8faff] px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
        <p className="shrink-0 text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{t('uploader.checklistTitle')}</p>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <InputChecklistItem key={`formats-${hasFile}-${validationPulseKey}`} checked={hasFile} label={t('uploader.checklistFormats')} detail={t('uploader.checklistFormatsDetail')} />
          <InputChecklistItem key={`marketplace-${hasFile}-${validationPulseKey}`} checked={hasFile} label={t('uploader.checklistMarketplace')} detail={t('uploader.checklistMarketplaceDetail')} />
          <InputChecklistItem key={`workflows-${hasFile}-${validationPulseKey}`} checked={hasFile} label={t('uploader.checklistWorkflows')} detail={t('uploader.checklistWorkflowsDetail')} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          assignFile(event.dataTransfer.files?.[0]);
        }}
        className={`group relative flex min-h-[204px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-5 py-4 text-center transition duration-200 ${
          isDragging
            ? 'border-[#2f80ed] bg-[#eaf3ff] shadow-lg shadow-blue-500/12 ring-4 ring-[#2f80ed]/12 dark:border-[#8bbdff] dark:bg-[#12264d] dark:ring-[#8bbdff]/12'
            : hasFile
              ? 'border-[#23d18b]/60 bg-[#f4fdf9] shadow-sm shadow-emerald-500/10 dark:border-[#23d18b]/35 dark:bg-[#23d18b]/8'
              : 'border-[#c7d7ff] bg-[#f3f6fc] hover:border-[#2f80ed] hover:bg-[#f8fbff] hover:shadow-lg hover:shadow-blue-500/10 dark:border-[#4d64a5] dark:bg-white/5 dark:hover:border-[#8bbdff]/70 dark:hover:bg-[#10264d]/70'
        }`}
      >
        <span className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#2f80ed]/45 to-transparent transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
        <span className="absolute left-5 top-4 rounded-full border border-[#d5dfef] bg-white px-3 py-1 text-[10px] font-black text-[#64708d] dark:border-white/10 dark:bg-[#0c1730] dark:text-white/60">
          {t('uploader.encrypted')}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-[#111b3f] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#ffb13b]">
          {t('uploader.package')}
        </span>

        <span className={`flex h-16 w-16 items-center justify-center rounded-full border transition ${
          isDragging
            ? 'scale-105 border-[#2f80ed] bg-white shadow-lg shadow-blue-500/18 dark:border-[#8bbdff] dark:bg-[#172b55]'
            : hasFile
              ? 'border-[#9be7c4] bg-[#effdf7] dark:border-[#23d18b]/30 dark:bg-[#23d18b]/10'
              : 'border-[#bdd5fa] bg-[#eaf3ff] group-hover:scale-105 dark:border-[#2f80ed]/30 dark:bg-[#10264d]'
        }`}>
          <span key={hasFile ? `validated-${validationPulseKey}` : 'upload-empty'} className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition ${
            hasFile ? 'bg-[#23d18b] shadow-emerald-500/20' : 'bg-[#2f80ed] shadow-blue-500/25'
          } ${hasFile ? 'animate-[upload-confirm_520ms_ease-out]' : ''}`}>
            {loading ? <Loader2 className="animate-spin" size={22} /> : file ? <CheckCircle2 size={22} /> : <UploadCloud size={23} />}
          </span>
        </span>

        <p className="mt-3 max-w-full break-words text-sm font-black text-[#111b3f] dark:text-white">
          {file ? file.name : isDragging ? t('uploader.dropHere') : t('uploader.emptyStateTitle')}
        </p>
        <p className="mt-1 text-sm text-[#64708d] dark:text-white/60">{file ? t('uploader.fileReady') : isDragging ? t('uploader.dropActiveText') : t('uploader.emptyStateText')}</p>

        <div className="mt-3 grid w-full max-w-[520px] gap-3 sm:grid-cols-3">
          <UploadFact label={t('uploader.accepted')} value={t('uploader.acceptedValue')} />
          <UploadFact label={t('uploader.maxSize')} value={t('uploader.maxSizeValue')} />
          <UploadFact label={t('uploader.security')} value={t('uploader.securityValue')} />
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".zip,.xml,.sql,.groovy"
          onChange={(event) => assignFile(event.target.files?.[0])}
        />
      </button>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-[#8a96b3] dark:text-white/45">
          <Info size={14} />
          {t('uploader.recommended')}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={clearFile}
            disabled={!file || loading}
            className="flex min-w-24 items-center justify-center gap-2 rounded-lg border border-[#d7e0ef] bg-white px-4 py-2.5 text-sm font-black text-[#64708d] transition disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/5 dark:text-white/65"
          >
            <X size={15} />
            {t('common.clear')}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex min-w-40 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6b8cff] to-[#c462e8] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#c9d4e5] disabled:text-white/80 disabled:shadow-none dark:disabled:bg-white/12 dark:disabled:text-white/35"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
            {loading ? t('uploader.analysing') : t('uploader.startAnalysis')}
          </button>
        </div>
      </div>
    </div>
  );
};

const InputChecklistItem = ({ checked, label, detail }: { checked: boolean; label: string; detail: string }) => (
  <div
    className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 transition ${
      checked
        ? 'animate-[checklist-confirm_420ms_ease-out] border-[#9be7c4] bg-[#effdf7] text-[#159866] dark:border-[#23d18b]/30 dark:bg-[#23d18b]/10 dark:text-[#67e8b9]'
        : 'border-[#dbe4f2] bg-white text-[#111b3f] dark:border-white/10 dark:bg-[#0c1730] dark:text-white'
    }`}
    title={`${label} - ${detail}`}
  >
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition ${
      checked
        ? 'bg-[#23d18b] text-white shadow-sm shadow-emerald-500/20'
        : 'bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]'
    }`}>
      <CheckCircle2 size={12} />
    </span>
    <div className="min-w-0">
      <p className="truncate text-[11px] font-black leading-4">{label}</p>
      <p className="sr-only">{detail}</p>
    </div>
  </div>
);

const UploadFact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[#dbe4f2] bg-white px-4 py-3 text-left dark:border-white/10 dark:bg-[#0c1730]">
    <p className="text-xs font-black text-[#111b3f] dark:text-white">{label}</p>
    <p className="mt-1 text-xs text-[#64708d] dark:text-white/55">{value}</p>
  </div>
);
