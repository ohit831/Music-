/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { APP_BASE_URL } from '../utils/appUrl';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Dumbbell,
  Sparkles,
  Zap,
  Flame,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  authService,
  UserProfile,
  GYM_AVATARS,
  GYM_VIBES,
} from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signup' | 'signin';
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signup',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<UserProfile['gymVibe']>('Heavy Lifting');
  const [selectedAvatar, setSelectedAvatar] = useState(GYM_AVATARS[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Sync mode with prop when opened
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    const res = await authService.signInWithGoogle();
    setIsGoogleLoading(false);
    if (res.success && res.user) {
      onSuccess?.(res.user);
      onClose();
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      if (mode === 'signup') {
        const res = authService.signUp({
          name,
          email,
          password,
          gymVibe: selectedVibe,
          avatarUrl: selectedAvatar,
        });

        setIsLoading(false);
        if (res.success && res.user) {
          onSuccess?.(res.user);
          onClose();
        } else {
          setErrorMessage(res.error || 'Registration failed.');
        }
      } else {
        const res = authService.signIn({
          email,
          password,
        });

        setIsLoading(false);
        if (res.success && res.user) {
          onSuccess?.(res.user);
          onClose();
        } else {
          setErrorMessage(res.error || 'Sign in failed.');
        }
      }
    }, 200);
  };

  const handleQuickDemo = (preset: 'warrior' | 'desi') => {
    setIsLoading(true);
    setTimeout(() => {
      const user = authService.quickSignIn(preset);
      setIsLoading(false);
      onSuccess?.(user);
      onClose();
    }, 150);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-[#121217] border border-white/10 rounded-3xl shadow-2xl shadow-emerald-950/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Header Accent with Gym Logo */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-emerald-950/60 via-[#16161d] to-[#121217] border-b border-white/5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <img
                src={`${APP_BASE_URL}icon.svg`}
                alt="Aura Music logo"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#1ed760]/40 shadow-lg shadow-[#1ed760]/20"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1ed760] rounded-full flex items-center justify-center text-black shadow-md">
                <Dumbbell className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Aura Music</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1ed760]/20 text-[#1ed760] px-2 py-0.5 rounded-full border border-[#1ed760]/30 font-mono">
                  GYM PRO
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {mode === 'signup'
                  ? 'Join the workout beats & emerging music community'
                  : 'Welcome back! Fuel your next workout session'}
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-black/40 rounded-xl mt-5 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-[#1ed760] to-emerald-400 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign Up (New Account)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-[#1ed760] to-emerald-400 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Log In (Existing)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Cloud Sign-In (Primary Recommended) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-800" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
            )}
            <span>Continue with Google (Cloud Sync)</span>
          </button>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#121217] px-3 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold absolute">
              Or Use Email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rohit Rathod"
                    className="w-full bg-[#181820] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#181820] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Password {mode === 'signup' && <span className="text-neutral-500 font-normal">(min 6 characters)</span>}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#181820] border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <>
                {/* Gym Workout Goal / Music Vibe */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span>Gym Workout Music Goal</span>
                    <span className="text-[10px] text-[#1ed760] font-normal">Customizes Playlists</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GYM_VIBES.map((vibe) => (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => setSelectedVibe(vibe)}
                        className={`p-2 text-left rounded-xl border text-xs font-medium transition-all flex items-center gap-2 ${
                          selectedVibe === vibe
                            ? 'bg-[#1ed760]/15 border-[#1ed760] text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <Dumbbell className={`w-3.5 h-3.5 ${selectedVibe === vibe ? 'text-[#1ed760]' : 'text-neutral-500'}`} />
                        <span className="truncate">{vibe}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar Selector */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Choose Gym Profile Avatar
                  </label>
                  <div className="flex items-center gap-3">
                    {GYM_AVATARS.map((avatar, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`relative rounded-full p-0.5 transition-all ${
                          selectedAvatar === avatar
                            ? 'ring-2 ring-[#1ed760] scale-110 shadow-lg shadow-[#1ed760]/30'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={avatar}
                          alt={`Avatar option ${idx + 1}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#1ed760] to-emerald-400 hover:brightness-110 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1ed760]/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : mode === 'signup' ? (
                <>
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Free Aura Music Account</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Sign In to Aura Music</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Instant Pass */}
          <div className="pt-2">
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#121217] px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold absolute">
                Instant 1-Click Access
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => handleQuickDemo('warrior')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-[#1ed760]">
                  <Flame className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>Gym Warrior</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Heavy Lifting Pro demo</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('desi')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-emerald-400">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Desi Power</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Kannada & Bollywood hits</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Privacy Notice */}
        <div className="px-6 py-3 bg-black/40 border-t border-white/5 text-center space-y-0.5">
          <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Your password is never stored or sent in member login activity.</span>
          </p>
          <p className="text-[10px] text-neutral-400">
            Only name, email, workout vibe & device appear to the site owner.
          </p>
        </div>
      </div>
    </div>
  );
};
