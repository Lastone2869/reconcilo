import { useState, useEffect } from 'react';
import { UserRole } from '@reconcilo/shared';

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  store_id?: string | null;
}

const STORAGE_KEY = 'reconcilo_auth_session';

export function getStoredSession(): { user: AuthUser | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default to staff user for seamless local demoing
      return {
        user: {
          user_id: 'user-staff-01',
          email: 'staff@reconcilo.com',
          name: 'Staff Operator',
          role: UserRole.STORE_STAFF,
          store_id: 'store-001',
        },
        token: 'stub-jwt-token-STORE_STAFF',
      };
    }
    return JSON.parse(raw);
  } catch {
    return { user: null, token: null };
  }
}

export function saveSession(user: AuthUser, token: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useAuthStore() {
  const [session, setSession] = useState(getStoredSession);

  const login = (user: AuthUser, token: string) => {
    saveSession(user, token);
    setSession({ user, token });
  };

  const logout = () => {
    clearSession();
    setSession({ user: null, token: null });
  };

  const switchRole = (newRole: UserRole) => {
    if (!session.user) return;
    const updated = { ...session.user, role: newRole };
    const token = `stub-jwt-token-${newRole}`;
    saveSession(updated, token);
    setSession({ user: updated, token });
  };

  return {
    user: session.user,
    token: session.token,
    isAuthenticated: !!session.token,
    login,
    logout,
    switchRole,
  };
}
