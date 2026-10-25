/*
 * Motor ekranları ORTAK önbelleği paylaşır (integration: iki hook + tek QueryClient, ekran yok).
 * Motor Stok'un çektiği liste satış ekranında beklemeden hazırdır; birinde silme yapılınca ikisi birden tazelenir.
 */
import React, { type ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sorguIstemcisiOlustur } from '../../shared/sorgu/sorguIstemcisi';
import { useMotorStok } from './motorStok/useMotorStok';
import { useSatisListesi } from './ikinciElMotor/useSatisListesi';
import { ikinciElMotorService } from './motorApi';
import { authService } from '../auth/authApi';
import { kayit } from '../../shared/test/kayit';
import type { Kullanici } from '../../shared/tipler';

vi.mock('./motorApi', () => ({ ikinciElMotorService: { getAll: vi.fn(), getStats: vi.fn(), getById: vi.fn(), delete: vi.fn() } }));
vi.mock('../auth/authApi', () => ({ authService: { getYatirimcilar: vi.fn() } }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/ikinci-el-motor', state: null }), useNavigate: () => vi.fn() }));

const STOKTA = { id: 1, plaka: '34AAA111', durum: 'stokta' };
const SATILDI = { id: 2, plaka: '06BBB222', durum: 'tamamlandi', yatirimci_id: 9 };

let istemci: QueryClient;
const sarmal = ({ children }: { children?: ReactNode }) => <QueryClientProvider client={istemci}>{children}</QueryClientProvider>;

beforeEach(() => {
  istemci = sorguIstemcisiOlustur({ retry: false, gcTime: Infinity });
  vi.mocked(ikinciElMotorService.getAll).mockResolvedValue({ data: [STOKTA, SATILDI] } as never);
  vi.mocked(ikinciElMotorService.getStats).mockResolvedValue({ data: { toplam_satis: 1 } } as never);
  vi.mocked(ikinciElMotorService.delete).mockResolvedValue({ data: {} } as never);
  vi.mocked(authService.getYatirimcilar).mockResolvedValue({ data: [{ id: 9, ad_soyad: 'Yatırımcı Veli' }] } as never);
  window.confirm = vi.fn(() => true);
});

test('Motor Stok açıldıktan sonra satış ekranı listeyi ve yatırımcı adlarını beklemeden önbellekten gösterir', async () => {
  const stok = renderHook(() => useMotorStok({ user: kayit<Kullanici>({ rol: 'admin' }) }), { wrapper: sarmal });
  await waitFor(() => expect(stok.result.current.motorlar).toHaveLength(2));
  await waitFor(() => expect(stok.result.current.yatirimcilar).toHaveLength(1));

  // İlk render'da (sunucu cevabı beklenmeden) veri hazır
  const satis = renderHook(() => useSatisListesi(), { wrapper: sarmal });
  expect(satis.result.current.motorlar.map((m) => m.plaka)).toEqual(['06BBB222']);
  expect(satis.result.current.stokMotorlar.map((m) => m.plaka)).toEqual(['34AAA111']);
  expect(satis.result.current.yatirimciMap).toEqual({ 9: 'Yatırımcı Veli' });
  expect(authService.getYatirimcilar).toHaveBeenCalledTimes(1);
});

test('satış ekranında silme yapılınca açık olan Motor Stok listesi de tazelenir', async () => {
  const stok = renderHook(() => useMotorStok({ user: kayit<Kullanici>({ rol: 'admin' }) }), { wrapper: sarmal });
  const satis = renderHook(() => useSatisListesi(), { wrapper: sarmal });
  await waitFor(() => expect(stok.result.current.motorlar).toHaveLength(2));

  vi.mocked(ikinciElMotorService.getAll).mockResolvedValue({ data: [STOKTA] } as never); // sunucuda satış kaydı silindi
  await act(() => satis.result.current.sil(2));

  await waitFor(() => expect(stok.result.current.motorlar.map((m) => m.plaka)).toEqual(['34AAA111']));
  expect(satis.result.current.motorlar).toEqual([]);
});
