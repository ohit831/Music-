/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  detectDeviceLabel,
  isOwnerUser,
  LoginMethod,
  SanitizedLoginEvent,
  sanitizeLoginEvent,
} from '../utils/loginAudit';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  gymVibe: 'Heavy Lifting' | 'Cardio Beast' | 'Desi Workout' | 'Mass Energy' | 'Chill Recovery';
  isPro: boolean;
  joinedDate: string;
  workoutStreak: number;
  listeningHours: number;
  favoriteGenre: string;
  authProvider?: 'google' | 'local' | 'demo';
  isEmailVerified?: boolean;
}

const STORAGE_KEY = 'apna_music_user_session';
const USERS_DB_KEY = 'apna_music_registered_users';
const LOGIN_AUDIT_KEY = 'apna_music_login_audit_v1';

export const GYM_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=150&auto=format&fit=crop&q=80',
];

export const GYM_VIBES: Array<UserProfile['gymVibe']> = [
  'Heavy Lifting',
  'Cardio Beast',
  'Desi Workout',
  'Mass Energy',
  'Chill Recovery',
];

export interface StoredUserAccount {
  profile: UserProfile;
  passwordHash: string;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Validates password strength (minimum 6 characters)
 */
export function isValidPassword(password: string): boolean {
  return password.trim().length >= 6;
}

/**
 * Simple password hash simulator for local storage
 */
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `apna_pwd_${Math.abs(hash)}`;
}

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Array<(user: UserProfile | null) => void> = [];
  private localAuditEvents: SanitizedLoginEvent[] = [];
  private auditListeners: Array<() => void> = [];
  private firebaseAuthUser: FirebaseUser | null = null;

  constructor() {
    this.initSession();
    this.initAuditLog();
    this.initFirebaseAuthListener();
  }

  private initSession() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch {
      this.currentUser = null;
    }
  }

  private initAuditLog() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOGIN_AUDIT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.localAuditEvents = parsed.map((item) => sanitizeLoginEvent(item));
        }
      }
    } catch {
      this.localAuditEvents = [];
    }
  }

  private saveLocalAuditLog() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LOGIN_AUDIT_KEY, JSON.stringify(this.localAuditEvents.slice(0, 100)));
    } catch {
      // Ignore storage error
    }
  }

  private initFirebaseAuthListener() {
    if (typeof window === 'undefined') return;
    try {
      onAuthStateChanged(auth, (fbUser) => {
        this.firebaseAuthUser = fbUser;
        if (fbUser && fbUser.email) {
          const cleanEmail = fbUser.email.trim().toLowerCase();
          const syncedProfile: UserProfile = {
            id: fbUser.uid,
            name: (fbUser.displayName || cleanEmail.split('@')[0] || 'Apna Listener').slice(0, 80),
            email: cleanEmail,
            avatarUrl: fbUser.photoURL || GYM_AVATARS[0],
            gymVibe:
              this.currentUser?.email === cleanEmail && this.currentUser?.gymVibe
                ? this.currentUser.gymVibe
                : 'Heavy Lifting',
            isPro: true,
            joinedDate:
              this.currentUser?.email === cleanEmail && this.currentUser?.joinedDate
                ? this.currentUser.joinedDate
                : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            workoutStreak:
              this.currentUser?.email === cleanEmail && this.currentUser?.workoutStreak
                ? this.currentUser.workoutStreak
                : 1,
            listeningHours:
              this.currentUser?.email === cleanEmail && this.currentUser?.listeningHours
                ? this.currentUser.listeningHours
                : 0.5,
            favoriteGenre: 'Gym Motivation & Hits',
            authProvider: 'google',
            isEmailVerified: fbUser.emailVerified,
          };

          this.currentUser = syncedProfile;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(syncedProfile));
          }
          this.notify();
        }
      });
    } catch {
      // Ignore auth listener init errors in non-browser tests
    }
  }

  public getCurrentUser(): UserProfile | null {
    if (!this.currentUser && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) this.currentUser = JSON.parse(raw);
      } catch {
        this.currentUser = null;
      }
    }
    return this.currentUser;
  }

  public subscribe(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentUser));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apnamusic:auth-changed', { detail: this.currentUser }));
    }
  }

  private notifyAuditListeners() {
    this.auditListeners.forEach((fn) => fn());
  }

  private getStoredUsers(): Record<string, StoredUserAccount> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(USERS_DB_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveStoredUsers(users: Record<string, StoredUserAccount>) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    } catch {
      // ignore storage error
    }
  }

  /**
   * Persist a strictly password-free login event to local audit history and, when Firebase-verified, to Firestore.
   */
  private async recordLoginAudit(profile: UserProfile, loginMethod: LoginMethod) {
    const sanitized = sanitizeLoginEvent({
      uid: this.firebaseAuthUser?.uid || profile.id,
      visitorName: profile.name,
      visitorEmail: profile.email,
      loginMethod,
      gymVibe: profile.gymVibe,
      deviceLabel: detectDeviceLabel(),
      loggedInAtMs: Date.now(),
      syncedToCloud: Boolean(this.firebaseAuthUser && this.firebaseAuthUser.emailVerified),
    });

    this.localAuditEvents = [sanitized, ...this.localAuditEvents].slice(0, 100);
    this.saveLocalAuditLog();
    this.notifyAuditListeners();

    const fbUser = this.firebaseAuthUser || auth.currentUser;
    if (fbUser && fbUser.emailVerified) {
      const eventPath = `login_events/${sanitized.id}`;
      try {
        await setDoc(doc(db, 'login_events', sanitized.id), {
          id: sanitized.id,
          uid: fbUser.uid,
          visitorName: sanitized.visitorName,
          visitorEmail: sanitized.visitorEmail,
          loginMethod: sanitized.loginMethod,
          gymVibe: sanitized.gymVibe,
          deviceLabel: sanitized.deviceLabel,
          loggedInAtIso: sanitized.loggedInAtIso,
          loggedInAt: serverTimestamp(),
        });

        // Also sync split user public profile & private email doc
        await setDoc(
          doc(db, 'users', fbUser.uid),
          {
            uid: fbUser.uid,
            displayName: sanitized.visitorName,
            gymVibe: sanitized.gymVibe,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await setDoc(
          doc(db, 'users', fbUser.uid, 'private', 'info'),
          {
            uid: fbUser.uid,
            email: sanitized.visitorEmail,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        // Log structured context cleanly without crashing UI playback
        try {
          handleFirestoreError(error, OperationType.WRITE, eventPath);
        } catch (structuredErr) {
          console.warn('[AuthService] Audit cloud write notice:', structuredErr);
        }
      }
    }
  }

  /**
   * Sign in with Google via Firebase Authentication (syncs across devices to Firestore)
   */
  public async signInWithGoogle(): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      this.firebaseAuthUser = fbUser;

      const cleanEmail = (fbUser.email || '').trim().toLowerCase();
      const cleanName = (fbUser.displayName || cleanEmail.split('@')[0] || 'Apna Listener').slice(0, 80);

      const newProfile: UserProfile = {
        id: fbUser.uid,
        name: cleanName,
        email: cleanEmail,
        avatarUrl: fbUser.photoURL || GYM_AVATARS[0],
        gymVibe: 'Heavy Lifting',
        isPro: true,
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        workoutStreak: 1,
        listeningHours: 0.5,
        favoriteGenre: 'Gym Motivation & Hits',
        authProvider: 'google',
        isEmailVerified: fbUser.emailVerified,
      };

      this.currentUser = newProfile;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      }
      this.notify();

      await this.recordLoginAudit(newProfile, 'google');
      return { success: true, user: newProfile };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Google Sign-In failed.';
      if (msg.includes('popup-closed-by-user')) {
        return { success: false, error: 'Google sign-in popup was closed before finishing.' };
      }
      return { success: false, error: msg };
    }
  }

  /**
   * Register a new user with Apna Music (password is NEVER included in audit logs)
   */
  public signUp(params: {
    name: string;
    email: string;
    password: string;
    gymVibe?: UserProfile['gymVibe'];
    avatarUrl?: string;
  }): { success: boolean; user?: UserProfile; error?: string } {
    const cleanName = params.name.trim();
    const cleanEmail = params.email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Please enter a valid name (at least 2 characters).' };
    }

    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!isValidPassword(params.password)) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const users = this.getStoredUsers();
    if (users[cleanEmail]) {
      return { success: false, error: 'An account with this email already exists. Please Sign In.' };
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      email: cleanEmail,
      avatarUrl: params.avatarUrl || GYM_AVATARS[0],
      gymVibe: params.gymVibe || 'Heavy Lifting',
      isPro: true,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      workoutStreak: 1,
      listeningHours: 0.5,
      favoriteGenre: 'Gym Motivation & Hits',
      authProvider: 'local',
      isEmailVerified: cleanEmail !== 'rohitrrathod1958@gmail.com',
    };

    users[cleanEmail] = {
      profile: newUser,
      passwordHash: hashPassword(params.password),
    };

    this.saveStoredUsers(users);
    this.currentUser = newUser;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    }
    this.notify();
    void this.recordLoginAudit(newUser, 'email_signup');

    return { success: true, user: newUser };
  }

  /**
   * Sign in existing local user (password is verified locally and NEVER logged)
   */
  public signIn(params: {
    email: string;
    password: string;
  }): { success: boolean; user?: UserProfile; error?: string } {
    const cleanEmail = params.email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const users = this.getStoredUsers();
    const existing = users[cleanEmail];

    if (!existing) {
      return { success: false, error: 'No account found with this email. Please Sign Up or Continue with Google.' };
    }

    if (existing.passwordHash !== hashPassword(params.password)) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const updatedProfile: UserProfile = {
      ...existing.profile,
      workoutStreak: (existing.profile.workoutStreak || 1) + 1,
      authProvider: 'local',
    };
    users[cleanEmail].profile = updatedProfile;
    this.saveStoredUsers(users);

    this.currentUser = updatedProfile;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
    }
    this.notify();
    void this.recordLoginAudit(updatedProfile, 'email_signin');

    return { success: true, user: updatedProfile };
  }

  /**
   * Quick 1-click Demo Sign-In
   */
  public quickSignIn(preset: 'warrior' | 'desi'): UserProfile {
    const presetProfile: UserProfile =
      preset === 'warrior'
        ? {
            id: 'usr_gym_warrior',
            name: 'Rohit Gym Beast',
            email: 'rohit@apnamusic.app',
            avatarUrl: GYM_AVATARS[2],
            gymVibe: 'Heavy Lifting',
            isPro: true,
            joinedDate: 'Nov 2026',
            workoutStreak: 14,
            listeningHours: 28.4,
            favoriteGenre: 'Hardstyle & EDM Motivation',
            authProvider: 'demo',
            isEmailVerified: true,
          }
        : {
            id: 'usr_desi_power',
            name: 'Apna Music Fan',
            email: 'fan@apnamusic.app',
            avatarUrl: GYM_AVATARS[1],
            gymVibe: 'Desi Workout',
            isPro: true,
            joinedDate: 'Nov 2026',
            workoutStreak: 7,
            listeningHours: 14.2,
            favoriteGenre: 'Kannada & Bollywood Gym Anthems',
            authProvider: 'demo',
            isEmailVerified: true,
          };

    this.currentUser = presetProfile;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presetProfile));
    }
    this.notify();
    void this.recordLoginAudit(presetProfile, 'quick_demo');
    return presetProfile;
  }

  /**
   * Subscribe to non-sensitive visitor login events for the site owner (rohitrrathod1958@gmail.com).
   */
  public subscribeOwnerLoginEvents(
    callback: (events: SanitizedLoginEvent[], cloudConnected: boolean) => void
  ): () => void {
    const emitMerged = (cloudEvents: SanitizedLoginEvent[] = [], cloudConnected = false) => {
      const seen = new Set<string>();
      const merged: SanitizedLoginEvent[] = [];

      for (const evt of [...cloudEvents, ...this.localAuditEvents]) {
        if (!seen.has(evt.id)) {
          seen.add(evt.id);
          merged.push(sanitizeLoginEvent(evt));
        }
      }
      merged.sort((a, b) => b.loggedInAtMs - a.loggedInAtMs);
      callback(merged, cloudConnected);
    };

    const fbUser = this.firebaseAuthUser || auth.currentUser;
    const isFirebaseVerifiedOwner = Boolean(
      fbUser && isOwnerUser(fbUser.email, fbUser.emailVerified)
    );

    let unsubFirestore: (() => void) | null = null;
    let latestCloud: SanitizedLoginEvent[] = [];

    if (isFirebaseVerifiedOwner) {
      const q = query(
        collection(db, 'login_events'),
        orderBy('loggedInAt', 'desc'),
        limit(100)
      );
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          latestCloud = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const ts = d.loggedInAt instanceof Timestamp ? d.loggedInAt.toMillis() : Date.parse(d.loggedInAtIso || '');
            return sanitizeLoginEvent({
              id: docSnap.id,
              uid: d.uid,
              visitorName: d.visitorName,
              visitorEmail: d.visitorEmail,
              loginMethod: d.loginMethod,
              gymVibe: d.gymVibe,
              deviceLabel: d.deviceLabel,
              loggedInAtMs: Number.isFinite(ts) ? ts : Date.now(),
              syncedToCloud: true,
            });
          });
          emitMerged(latestCloud, true);
        },
        (error) => {
          console.warn('[AuthService] Owner login_events listener notice:', error.message);
          emitMerged([], false);
        }
      );
    } else {
      emitMerged([], false);
    }

    const localListener = () => emitMerged(latestCloud, isFirebaseVerifiedOwner);
    this.auditListeners.push(localListener);

    return () => {
      this.auditListeners = this.auditListeners.filter((fn) => fn !== localListener);
      if (unsubFirestore) unsubFirestore();
    };
  }

  public clearLocalAuditLogs() {
    this.localAuditEvents = [];
    this.saveLocalAuditLog();
    this.notifyAuditListeners();
  }

  /**
   * Update current user profile
   */
  public updateProfile(updates: Partial<UserProfile>): UserProfile | null {
    if (!this.currentUser) return null;

    const updated: UserProfile = {
      ...this.currentUser,
      ...updates,
    };

    this.currentUser = updated;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    const users = this.getStoredUsers();
    if (users[updated.email]) {
      users[updated.email].profile = updated;
      this.saveStoredUsers(users);
    }

    const fbUser = this.firebaseAuthUser || auth.currentUser;
    if (fbUser && fbUser.emailVerified && updates.gymVibe) {
      setDoc(
        doc(db, 'users', fbUser.uid),
        {
          uid: fbUser.uid,
          displayName: updated.name.slice(0, 80),
          gymVibe: updated.gymVibe.slice(0, 48),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    }

    this.notify();
    return updated;
  }

  /**
   * Sign out current user
   */
  public signOut() {
    this.currentUser = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    firebaseSignOut(auth).catch(() => {});
    this.notify();
  }
}

export const authService = new AuthService();
