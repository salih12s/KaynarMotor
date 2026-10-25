import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { API_URL } from '../../shared/api/istemci';
import type { Kullanici } from '../../shared/tipler';

interface AuthDegeri {
  user: Kullanici | null;
  token: string | null;
  loading: boolean;
  login: (kullanici: Kullanici, anahtar: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthDegeri | null>(null);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<Kullanici | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (response.ok) {
            const data = (await response.json()) as { user: Kullanici };
            setUser(data.user);
            setToken(savedToken);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, []);

  const login = (userData: Kullanici, tokenData: string) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthDegeri => {
  const deger = useContext(AuthContext);
  if (!deger) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return deger;
};
// Karlılık bilgisi (kâr tutarı, kâr oranı, net kâr) yalnızca admin'e gösterilir; sunucu da bu alanları
// admin dışına göndermez (backend/middleware/yetki.js kariGizle).
export const useKarGor = () => useContext(AuthContext)?.user?.rol === 'admin';
export default AuthContext;
