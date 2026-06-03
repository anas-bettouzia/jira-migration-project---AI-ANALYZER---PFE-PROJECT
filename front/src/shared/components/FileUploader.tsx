import React, { useRef, useState } from 'react';
import { CheckCircle2, Info, Loader2, UploadCloud, X } from 'lucide-react';
import { analysisService } from '../../services/analysisService';

interface FileUploaderProps {
  onUploadSuccess: (jobId: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const assignFile = (nextFile?: File) => {
    if (nextFile) setFile(nextFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await analysisService.uploadFile(file);
      onUploadSuccess(result.job_id);
    } catch {
      alert("Erreur lors de l'envoi du fichier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
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
        className={`relative flex min-h-[238px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition ${
          isDragging ? 'border-[#2f80ed] bg-[#f2f7ff] dark:bg-[#10264d]' : 'border-[#c7d7ff] bg-[#f3f6fc] dark:border-[#4d64a5] dark:bg-white/5'
        }`}
      >
        <span className="absolute left-5 top-4 rounded-full border border-[#d5dfef] bg-white px-3 py-1 text-[10px] font-black text-[#64708d] dark:border-white/10 dark:bg-[#0c1730] dark:text-white/60">
          Encrypted
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-[#111b3f] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#ffb13b]">
          .zip package
        </span>

        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#bdd5fa] bg-[#eaf3ff] dark:border-[#2f80ed]/30 dark:bg-[#10264d]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2f80ed] text-white shadow-lg shadow-blue-500/25">
            {loading ? <Loader2 className="animate-spin" size={22} /> : file ? <CheckCircle2 size={22} /> : <UploadCloud size={23} />}
          </span>
        </span>

        <p className="mt-4 max-w-full break-words text-sm font-black text-[#111b3f] dark:text-white">
          {file ? file.name : 'Drop your archive into the intake zone'}
        </p>
        <p className="mt-1 text-sm text-[#64708d] dark:text-white/60">Drag and drop your export file here, or browse from device.</p>

        <div className="mt-5 grid w-full max-w-[520px] gap-3 sm:grid-cols-3">
          <UploadFact label="Accepted" value=".zip export package" />
          <UploadFact label="Max size" value="200 MB" />
          <UploadFact label="Security" value="Encrypted in transit" />
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".zip,.xml,.sql,.groovy"
          onChange={(event) => assignFile(event.target.files?.[0])}
        />
      </button>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-[#8a96b3] dark:text-white/45">
          <Info size={14} />
          Recommended export: full Script Registry package
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={!file || loading}
            className="flex min-w-20 items-center justify-center gap-2 rounded-lg border border-[#d7e0ef] bg-white px-5 py-3 text-sm font-black text-[#64708d] transition disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/5 dark:text-white/65"
          >
            <X size={15} />
            Clear
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex min-w-36 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6b8cff] to-[#c462e8] px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
            {loading ? 'Analysing...' : 'Start analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UploadFact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[#dbe4f2] bg-white px-4 py-3 text-left dark:border-white/10 dark:bg-[#0c1730]">
    <p className="text-xs font-black text-[#111b3f] dark:text-white">{label}</p>
    <p className="mt-1 text-xs text-[#64708d] dark:text-white/55">{value}</p>
  </div>
);