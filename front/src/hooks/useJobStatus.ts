// src/hooks/useJobStatus.ts
import { useState, useEffect } from 'react';
import { analysisService } from '../services/analysisService';

export const useJobStatus = (jobId: string | null) => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return;
    }

    let isMounted = true;
    // Correction ici : on utilise le type natif de setTimeout
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkStatus = async () => {
      try {
        const data = await analysisService.getJobStatus(jobId);
        if (isMounted) {
          setStatus(data);
          
          // Si le statut est encore en cours, on relance la fonction dans 3 secondes
          if (data.status !== 'COMPLETED' && data.status !== 'FAILED') {
            timeoutId = setTimeout(checkStatus, 3000);
          }
        }
      } catch (error) {
        console.error("Erreur check status:", error);
        // On peut retenter même en cas d'erreur réseau temporaire
        if (isMounted) timeoutId = setTimeout(checkStatus, 5000);
      }
    };

    checkStatus();

    // Cleanup : on annule le timeout si le composant est détruit ou si jobId change
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [jobId]);

  return status;
};