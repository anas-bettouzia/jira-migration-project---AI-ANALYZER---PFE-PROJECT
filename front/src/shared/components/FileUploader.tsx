import React, { useState } from 'react';
import { analysisService } from '../../services/analysisService';

// 1. On définit l'interface pour accepter la fonction de callback
interface FileUploaderProps {
  onUploadSuccess: (jobId: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await analysisService.uploadFile(file);
      // 2. On appelle la fonction passée par le parent avec l'ID reçu
      onUploadSuccess(result.job_id);
    } catch (error) {
      alert("Erreur lors de l'envoi du fichier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p className="mb-2 text-sm text-gray-500 font-semibold">
            {file ? file.name : "Cliquez pour uploader ou glissez-déposez"}
          </p>
          <p className="text-xs text-gray-400">ZIP, XML ou SQL (Max. 500MB)</p>
        </div>
        <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      
      <button 
        onClick={handleUpload}
        disabled={!file || loading}
        className={`mt-6 w-full py-3 px-6 rounded-xl font-bold text-white transition-all ${
          loading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg active:scale-95'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Traitement...
          </span>
        ) : "Lancer l'analyse"}
      </button>
    </div>
  );
};