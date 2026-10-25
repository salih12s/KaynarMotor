/*
 * Yetkilendirme sayfası testleri: reddedilen kullanıcılar listede görünmez (personel ve muhasebeci), sayfa kendi başlığını
 * tekrarlamaz (başlık üst çubukta, Layout'ta). Sunucu çağrısı sahtedir (vi.mock); süzme kuralı ekrandaki sonuçla sınanır.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Yetkilendirme from './Yetkilendirme';
import { authService } from './authApi';

vi.mock('./authApi', () => ({ authService: { getUsers: vi.fn(), setYetkiler: vi.fn() } }));

const kisi = (id: number, ad: string, rol: string, onay: string) => ({ id, ad_soyad: ad, kullanici_adi: `k${id}`, rol, onay_durumu: onay });
const KULLANICILAR = [
  kisi(1, 'Onaylı Personel', 'personel', 'onaylandi'),
  kisi(2, 'Bekleyen Personel', 'personel', 'beklemede'),
  kisi(3, 'Reddedilen Personel', 'personel', 'reddedildi'),
  kisi(4, 'Onaylı Muhasebeci', 'muhasebeci', 'onaylandi'),
  kisi(5, 'Reddedilen Muhasebeci', 'muhasebeci', 'reddedildi'),
];

beforeEach(() => {
  vi.mocked(authService.getUsers).mockResolvedValue({ data: KULLANICILAR } as never);
});

describe('Yetkilendirme', () => {
  test('reddedilen personel ve muhasebeci listede yoktur; onaylı ve bekleyenler vardır', async () => {
    render(<Yetkilendirme />);
    expect(await screen.findByText('Onaylı Personel')).toBeInTheDocument();
    expect(screen.getByText('Bekleyen Personel')).toBeInTheDocument();
    expect(screen.getByText('Onaylı Muhasebeci')).toBeInTheDocument();
    expect(screen.queryByText('Reddedilen Personel')).not.toBeInTheDocument();
    expect(screen.queryByText('Reddedilen Muhasebeci')).not.toBeInTheDocument();
  });

  test('sayfa içinde "Yetkilendirme" başlığı tekrarlanmaz (üst çubukta zaten var)', async () => {
    render(<Yetkilendirme />);
    await screen.findByText('Onaylı Personel');
    expect(screen.queryByRole('heading', { name: 'Yetkilendirme' })).not.toBeInTheDocument();
    expect(screen.getByText('Muhasebeciler')).toBeInTheDocument();
  });
});
