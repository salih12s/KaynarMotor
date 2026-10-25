import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

/** İstek gövdesi: sunucu zod ile doğrular; ekran formları serbest alanlı nesne gönderir. */
export type Govde = Record<string, unknown>;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface HataGovdesi {
  code?: string;
  message?: unknown;
}

// Oturumun bittiğini gösteren yanıtlar. Backend süresi dolmuş token'a 403 döndüğü için
// yalnızca status'e bakmak yetmez: 403 aynı zamanda "bu işleme yetkin yok" anlamına da
// gelir ve o durumda kullanıcı ASLA çıkışa zorlanmamalıdır. Ayrım code alanıyla yapılır
// (eski sürüm backend'lerde code gelmeyebileceği için mesaj metni yedek kontroldür).
const oturumBittiMi = (error: unknown): boolean => {
  if (!axios.isAxiosError<HataGovdesi>(error)) return false;
  const status = error.response?.status;
  if (status === 401) return true;
  if (status !== 403) return false;
  const data: HataGovdesi = error.response?.data || {};
  if (data.code) return data.code === 'TOKEN_INVALID' || data.code === 'TOKEN_MISSING';
  return typeof data.message === 'string' && data.message.toLowerCase().includes('token');
};

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (oturumBittiMi(error)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Zaten login sayfasındaysak yeniden yönlendirip döngü oluşturma
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
