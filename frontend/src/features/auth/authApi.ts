import api, { type Govde } from '../../shared/api/istemci';
import type { AktiviteKaydi, Kullanici, KullaniciOzeti, YatirimciKaydi } from '../../shared/tipler';

/** Giriş yanıtı: oturum anahtarı ve kullanıcı. */
export interface GirisYaniti {
  token: string;
  user: Kullanici;
  message?: string;
}

// Auth
export const authService = {
  login: (data: Govde) => api.post<GirisYaniti>('/auth/login', data),
  register: (data: Govde) => api.post<{ message: string }>('/auth/register', data),
  logout: () => api.post<unknown>('/auth/logout'),
  verify: () => api.get<{ user: Kullanici }>('/auth/verify'),
  getUsers: () => api.get<Kullanici[]>('/auth/users'),
  createUser: (data: Govde) => api.post<unknown>('/auth/users', data),
  getYatirimcilar: () => api.get<YatirimciKaydi[]>('/auth/yatirimcilar'),
  getPersonelListesi: () => api.get<KullaniciOzeti[]>('/auth/personel-listesi'),
  approveUser: (id: number) => api.patch<unknown>(`/auth/users/${id}/approve`),
  rejectUser: (id: number) => api.patch<unknown>(`/auth/users/${id}/reject`),
  deleteUser: (id: number) => api.delete<unknown>(`/auth/users/${id}`),
  setSifre: (id: number, sifre: string) => api.patch<unknown>(`/auth/users/${id}/sifre`, { sifre }),
  setYetkiler: (id: number, yetkiler: Govde) => api.patch<unknown>(`/auth/users/${id}/yetkiler`, yetkiler),
  getActivityLogs: () => api.get<AktiviteKaydi[]>('/auth/activity-logs'),
  getUserActivityLogs: (id: number) => api.get<AktiviteKaydi[]>(`/auth/users/${id}/activity-logs`),
};
