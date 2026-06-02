import { useState, useEffect } from 'react';
import { analysisService } from '../services/analysisService';

export const useJobStatus = (jobId: string | null) => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      const data = await analysisService.getJobStatus(jobId);
      setStatus(data);
      
      // Si le job est fini ou en erreur, on arrête de demander
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        clearInterval(interval);
      }
    };

    const interval = setInterval(checkStatus, 3000); // Vérifie toutes les 3s
    checkStatus();

    return () => clearInterval(interval);
  }, [jobId]);

  return status;
};