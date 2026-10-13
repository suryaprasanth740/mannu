import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const { setLang } = useI18n();

  const apply = useCallback((data) => {
    setUser(data?.user || null);
    setFarmerProfile(data?.farmerProfile || null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await api.get('/auth/me'));
    } catch {
      apply(null);
    } finally {
      setReady(true);
    }
  }, [apply]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      const data = await api.post('/auth/login', { email, password });
      apply(data);
      if (data.user?.language) setLang(data.user.language);
      return data.user;
    },
    [apply, setLang]
  );

  const register = useCallback(
    async (payload) => {
      const data = await api.post('/auth/register', payload);
      apply(data);
      return data.user;
    },
    [apply]
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    apply(null);
  }, [apply]);

  const value = useMemo(
    () => ({ user, farmerProfile, ready, login, register, logout, refresh, setUser, setFarmerProfile, apply }),
    [user, farmerProfile, ready, login, register, logout, refresh, apply]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
