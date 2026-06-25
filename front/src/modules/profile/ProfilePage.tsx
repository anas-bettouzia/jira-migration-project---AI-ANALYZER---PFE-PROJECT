import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, Mail, Save, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { MainSidebar } from '../../shared/components/MainSidebar';
import { LocaleSwitcher } from '../../shared/components/LocaleSwitcher';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import type { AuthUser } from '../../shared/types/auth';
import { EMAIL_ERROR, EMAIL_REGEX, PASSWORD_ERROR, PASSWORD_REGEX } from '../../services/validation';

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || fallback;
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, setToken } = useAuthStore();
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(!user);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await authService.getProfile();
        if (!isMounted) return;
        setProfile(data);
        setEmail(data.email);
        setUser(data);
      } catch (error) {
        if (isMounted) setProfileError(getErrorMessage(error, 'Impossible de charger le profil.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [setUser]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMessage('');
    setProfileError('');

    const nextEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(nextEmail)) {
      setProfileError(EMAIL_ERROR);
      return;
    }

    setSavingProfile(true);
    try {
      const data = await authService.updateProfile(nextEmail);
      setProfile(data.user);
      setEmail(data.user.email);
      if (data.token) setToken(data.token, data.user);
      else setUser(data.user);
      setProfileMessage(data.message);
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Impossible de mettre a jour le profil.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordError(PASSWORD_ERROR);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSavingPassword(true);
    try {
      const data = await authService.changePassword(currentPassword, newPassword);
      setPasswordMessage(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(getErrorMessage(error, 'Impossible de changer le mot de passe.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
      <MainSidebar activePage="overview" />
      <div className="min-h-screen md:pl-[72px]">
        <header className="sticky top-0 z-30 border-b border-[#dce4f4] bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#0c1730]/95">
          <div className="flex h-[62px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0ef] text-[#64708d] transition hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:text-white/65 dark:hover:bg-white/6"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">Account settings</p>
                <h1 className="text-base font-black sm:text-lg">Profile</h1>
              </div>
            </div>
            <div className="ml-auto">
              <LocaleSwitcher className="hidden sm:flex" />
            </div>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <section className="mx-auto max-w-5xl">
            <div className="mb-8 rounded-[22px] bg-[#111b3f] p-6 text-white shadow-xl shadow-[#111b3f]/10 dark:bg-[#101d3a] sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8bbdff]">User profile</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">Manage your account access</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                    Review your email identity and update your local password when needed.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-xs font-black uppercase text-white/70">
                  <ShieldCheck size={15} />
                  {profile?.auth_provider === 'google' ? 'Google OAuth' : 'Local account'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-[22px] bg-white shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10">
                <Loader2 className="animate-spin text-[#2f80ed]" size={28} />
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <form onSubmit={handleProfileSubmit} className="rounded-[22px] bg-white p-6 shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10 sm:p-7">
                  <div className="mb-6 flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]">
                      <Mail size={20} />
                    </span>
                    <div>
                      <h2 className="text-lg font-black">Profile information</h2>
                      <p className="mt-1 text-sm text-[#64708d] dark:text-white/55">Update the email linked to this account.</p>
                    </div>
                  </div>

                  <label className="mb-2 block text-xs font-black uppercase text-[#64708d] dark:text-white/50">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-[#d7e0ef] bg-[#f8faff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />

                  {profileError && <p className="mt-4 text-sm font-bold text-red-600 dark:text-red-300">{profileError}</p>}
                  {profileMessage && <p className="mt-4 text-sm font-bold text-emerald-600 dark:text-emerald-300">{profileMessage}</p>}

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f80ed] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#256fdb] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                    Save profile
                  </button>
                </form>

                <form onSubmit={handlePasswordSubmit} className="rounded-[22px] bg-white p-6 shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10 sm:p-7">
                  <div className="mb-6 flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4df] text-[#b76b00] dark:bg-[#f59e0b]/12 dark:text-[#ffbe4d]">
                      <KeyRound size={20} />
                    </span>
                    <div>
                      <h2 className="text-lg font-black">Change password</h2>
                      <p className="mt-1 text-sm text-[#64708d] dark:text-white/55">Use your current password before setting a new one.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <PasswordInput label="Current password" value={currentPassword} onChange={setCurrentPassword} />
                    <PasswordInput label="New password" value={newPassword} onChange={setNewPassword} />
                    <PasswordInput label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
                  </div>

                  {passwordError && <p className="mt-4 text-sm font-bold text-red-600 dark:text-red-300">{passwordError}</p>}
                  {passwordMessage && <p className="mt-4 text-sm font-bold text-emerald-600 dark:text-emerald-300">{passwordMessage}</p>}

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111b3f] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#111b3f]/12 transition hover:bg-[#1d2b5b] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-[#111b3f]"
                  >
                    {savingPassword ? <Loader2 className="animate-spin" size={17} /> : <KeyRound size={17} />}
                    Update password
                  </button>
                </form>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

const PasswordInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <div>
    <label className="mb-2 block text-xs font-black uppercase text-[#64708d] dark:text-white/50">{label}</label>
    <input
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-[#d7e0ef] bg-[#f8faff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-white"
    />
  </div>
);

export default ProfilePage;
