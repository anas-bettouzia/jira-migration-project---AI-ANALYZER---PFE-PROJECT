import React, { useState } from 'react';
import { Lock, Mail, Loader2, X } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await authService.login(email, password);
      setToken(data.token);
      onClose(); // Fermer la modal
      navigate('/analysis'); 
    } catch (err) {
      setError('Identifiants invalides.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay avec flou */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Contenu de la Modal */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 animate-in fade-in zoom-in duration-300">
        
        {/* Bouton Fermer */}
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Connexion</h2>
          <p className="text-sm text-slate-500 mt-2">Accédez à votre assistant de migration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center animate-shake">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[var(--spectrum-blue)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "S'identifier"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;