import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, KeyRound, Loader2, Mail, Save, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { MainSidebar } from '../../shared/components/MainSidebar';
import { LocaleSwitcher } from '../../shared/components/LocaleSwitcher';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { useI18n } from '../../i18n';
import type { AuthUser } from '../../shared/types/auth';
import { EMAIL_ERROR, EMAIL_REGEX, PASSWORD_ERROR, PASSWORD_REGEX } from '../../services/validation';

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || fallback;
};

const getProfileInitials = (profile: AuthUser | null, fallbackEmail: string) => {
  const source = profile?.name || profile?.username || profile?.email || fallbackEmail || 'U';
  const parts = source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);

  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
};

const AVATAR_SIZE = 384;
const AVATAR_QUALITY = 0.82;
const MAX_COMPRESSED_AVATAR_BYTES = 750 * 1024;

const getDataUrlByteSize = (dataUrl: string) => {
  const base64Payload = dataUrl.split(',')[1] ?? '';
  return Math.ceil((base64Payload.length * 3) / 4);
};

const compressProfilePicture = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Unable to read image.'));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error('Unable to load image.'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Unable to prepare image.'));
          return;
        }

        const sourceSize = Math.min(image.width, image.height);
        const sourceX = (image.width - sourceSize) / 2;
        const sourceY = (image.height - sourceSize) / 2;

        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          AVATAR_SIZE,
          AVATAR_SIZE
        );

        const compressed = canvas.toDataURL('image/jpeg', AVATAR_QUALITY);
        if (getDataUrlByteSize(compressed) > MAX_COMPRESSED_AVATAR_BYTES) {
          reject(new Error('Image is too large.'));
          return;
        }

        resolve(compressed);
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { user, setUser, setToken } = useAuthStore();
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [email, setEmail] = useState(user?.email ?? '');
  const [picturePreview, setPicturePreview] = useState<string | null>(user?.picture ?? null);
  const [selectedPictureFile, setSelectedPictureFile] = useState<File | null>(null);
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
  const isGoogleAccount = profile?.auth_provider === 'google';
  const profileInitials = getProfileInitials(profile, email);
  const displayName = profile?.name || profile?.username || email.split('@')[0] || t('profile.consultant');
  const accountTypeLabel = isGoogleAccount ? t('profile.googleOAuth') : t('profile.localAccount');
  const preferredLanguageLabel = language === 'fr' ? t('common.french') : t('common.english');

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await authService.getProfile();
        if (!isMounted) return;
        setProfile(data);
        setEmail(data.email);
        setPicturePreview(data.picture ?? null);
        setUser(data);
      } catch (error) {
        if (isMounted) setProfileError(getErrorMessage(error, t('profile.loadError')));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [setUser, t]);

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
      const pictureValue = selectedPictureFile ? picturePreview ?? undefined : undefined;
      const data = await authService.updateProfile(nextEmail, pictureValue);
      setProfile(data.user);
      setEmail(data.user.email);
      setPicturePreview(data.user.picture ?? null);
      if (data.token) setToken(data.token, data.user);
      else setUser(data.user);
      setSelectedPictureFile(null);
      setProfileMessage(t('profile.savedSuccess'));
    } catch (error) {
      setProfileError(getErrorMessage(error, t('profile.updateError')));
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
      setPasswordError(t('auth.passwordMismatch'));
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordMessage(t('profile.passwordSavedSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(getErrorMessage(error, t('profile.passwordError')));
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError('');
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedPictureFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setProfileError(t('profile.imageTypeError'));
      event.target.value = '';
      return;
    }

    try {
      const compressedPicture = await compressProfilePicture(file);
      setPicturePreview(compressedPicture);
      setSelectedPictureFile(file);
    } catch {
      setProfileError(t('profile.imageTypeError'));
      setSelectedPictureFile(null);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
      <MainSidebar activePage="overview" />
      <div className="min-h-screen md:pl-[88px]">
        <header className="sticky top-0 z-30 border-b border-[#dce4f4] bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#0c1730]/95">
          <div className="flex h-[62px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0ef] text-[#64708d] transition hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:text-white/65 dark:hover:bg-white/6"
                aria-label={t('common.back')}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{t('profile.accountSettings')}</p>
                <h1 className="text-base font-black sm:text-lg">{t('profile.title')}</h1>
              </div>
            </div>
            <div className="ml-auto">
              <LocaleSwitcher className="hidden sm:flex" dropdownAlign="right" />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <section className="mx-auto max-w-6xl">
            <div className="mb-6 rounded-[22px] bg-[#111b3f] p-5 text-white shadow-xl shadow-[#111b3f]/10 dark:bg-[#101d3a] sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8bbdff]">{t('profile.consultantProfile')}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{t('profile.manageTitle')}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                    {t('profile.manageText')}
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-3xl bg-white/8 p-3 pr-5 ring-1 ring-white/10">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-black text-[#2f80ed]">
                    {picturePreview ? (
                      <img src={picturePreview} alt={t('profile.profilePhoto')} className="h-full w-full object-cover" />
                    ) : (
                      profileInitials
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black leading-tight">{profile?.username || profile?.name || t('profile.consultant')}</p>
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-black uppercase text-white/65">
                      <ShieldCheck size={12} />
                      {isGoogleAccount ? t('profile.googleOAuth') : t('profile.localAccount')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-[22px] bg-white shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10">
                <Loader2 className="animate-spin text-[#2f80ed]" size={28} />
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
                <form onSubmit={handleProfileSubmit} className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10 sm:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]">
                      <Mail size={20} />
                    </span>
                    <div>
                      <h2 className="text-lg font-black">{t('profile.profileInfo')}</h2>
                      <p className="mt-1 text-sm text-[#64708d] dark:text-white/55">{t('profile.profileInfoText')}</p>
                    </div>
                  </div>

                  <div className="mb-5 rounded-[22px] border border-[#dbe4f2] bg-[#f8faff] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <label className="mb-2 block text-xs font-black uppercase text-[#64708d] dark:text-white/50">{t('profile.profilePhoto')}</label>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[26px] bg-gradient-to-br from-[#eaf3ff] to-white text-2xl font-black text-[#2f80ed] shadow-sm ring-1 ring-[#d7e0ef] dark:from-[#1a2a52] dark:to-[#101d3a] dark:text-[#8bbdff] dark:ring-white/10">
                        {picturePreview ? (
                          <img src={picturePreview} alt={t('profile.profilePhoto')} className="h-full w-full object-cover" />
                        ) : (
                          profileInitials
                        )}
                        <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#2f80ed] text-white shadow-lg shadow-blue-500/25">
                          <Camera size={15} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <p className="text-sm font-black text-[#111b3f] dark:text-white">
                            {picturePreview ? t('profile.photoReady') : t('profile.initialsAvatar')}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#64708d] dark:text-white/55">{t('profile.profilePhotoHint')}</p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#d7e0ef] bg-white px-4 py-3 text-sm font-black text-[#111b3f] transition hover:border-[#2f80ed] dark:border-white/10 dark:bg-[#0f172a] dark:text-white">
                          <Camera size={16} className="text-[#2f80ed]" />
                          <span>{t('profile.choosePhoto')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePictureChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <label className="mb-2 block text-xs font-black uppercase text-[#64708d] dark:text-white/50">{t('common.emailAddress')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-[#d7e0ef] bg-[#f8faff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />

                  <InlineFeedback type="error" message={profileError} />
                  <InlineFeedback type="success" message={profileMessage} />

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f80ed] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#256fdb] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                    {t('profile.saveProfile')}
                  </button>
                </form>

                <div className="space-y-5">
                  <section className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10 sm:p-6">
                    <div className="mb-5 flex items-start gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]">
                        <ShieldCheck size={20} />
                      </span>
                      <div>
                        <h2 className="text-lg font-black">{t('profile.reportIdentityTitle')}</h2>
                        <p className="mt-1 text-sm text-[#64708d] dark:text-white/55">{t('profile.reportIdentityText')}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <IdentityField label={t('profile.identityName')} value={displayName} />
                      <IdentityField label={t('profile.identityEmail')} value={profile?.email || email || '-'} />
                      <IdentityField label={t('profile.identityAccount')} value={accountTypeLabel} />
                      <IdentityField label={t('profile.identityLanguage')} value={preferredLanguageLabel} />
                    </div>
                  </section>

                  {isGoogleAccount ? (
                    <section className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10 sm:p-6">
                      <div className="mb-5 flex items-start gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8fbf3] text-[#0a9f6a] dark:bg-emerald-400/12 dark:text-emerald-300">
                          <CheckCircle2 size={20} />
                        </span>
                        <div>
                          <h2 className="text-lg font-black">{t('profile.googlePasswordTitle')}</h2>
                          <p className="mt-1 text-sm text-[#64708d] dark:text-white/55">{t('profile.googlePasswordText')}</p>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-[#dbe4f2] bg-[#f8faff] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-xs font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{t('profile.securedBy')}</p>
                        <p className="mt-2 text-2xl font-black text-[#111b3f] dark:text-white">Google</p>
                        <p className="mt-2 text-sm leading-6 text-[#64708d] dark:text-white/55">{t('profile.googleManagedHint')}</p>
                      </div>
                    </section>
                  ) : (
                    <form onSubmit={handlePasswordSubmit} className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10 sm:p-6">
                      <div className="mb-5 flex items-start gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4df] text-[#b76b00] dark:bg-[#f59e0b]/12 dark:text-[#ffbe4d]">
                          <KeyRound size={20} />
                        </span>
                        <div>
                          <h2 className="text-lg font-black">{t('profile.changePassword')}</h2>
                          <p className="mt-1 text-sm text-[#64708d] dark:text-white/55">{t('profile.changePasswordText')}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <PasswordInput label={t('profile.currentPassword')} value={currentPassword} onChange={setCurrentPassword} />
                        <PasswordInput label={t('profile.newPassword')} value={newPassword} onChange={setNewPassword} />
                        <PasswordInput label={t('profile.confirmNewPassword')} value={confirmPassword} onChange={setConfirmPassword} />
                      </div>

                      <InlineFeedback type="error" message={passwordError} />
                      <InlineFeedback type="success" message={passwordMessage} />

                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111b3f] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#111b3f]/12 transition hover:bg-[#1d2b5b] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-[#111b3f]"
                      >
                        {savingPassword ? <Loader2 className="animate-spin" size={17} /> : <KeyRound size={17} />}
                        {t('profile.updatePassword')}
                      </button>
                    </form>
                  )}
                </div>
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

const IdentityField = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-[#dbe4f2] bg-[#f8faff] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
    <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/40">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-[#111b3f] dark:text-white" title={value}>
      {value}
    </p>
  </div>
);

const InlineFeedback = ({ type, message }: { type: 'success' | 'error'; message: string }) => {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200'
          : 'border-red-200 bg-red-50 text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
};

export default ProfilePage;
