/*
 * Tam sayfa "Yeni İş Emri" formu (IsEmriForm) için regression testi.
 * Ad Soyad alanı serbest metin (freeSolo) Autocomplete'idir: listeden seçmeden Enter'a basılınca onChange'e müşteri nesnesi değil
 * string gelir. Eskiden string de müşteri sayılıp telefon ve adres boşaltılıyordu (tip denetimi geçişinde bulundu).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IsEmriForm from './IsEmriForm';
import { isEmriService } from './servisApi';
import { musteriService } from '../musteriler/musteriApi';
import { useKarGor } from '../auth/AuthContext';

vi.mock('./servisApi', () => ({ isEmriService: { getNextFisNo: vi.fn(), getById: vi.fn() } }));
vi.mock('../musteriler/musteriApi', () => ({ musteriService: { search: vi.fn() } }));
vi.mock('../auth/AuthContext', () => ({ useKarGor: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useParams: () => ({}) }));

beforeEach(() => {
  vi.mocked(useKarGor).mockReturnValue(true);
  vi.mocked(isEmriService.getNextFisNo).mockResolvedValue({ data: { nextFisNo: 104 } } as never);
  vi.mocked(musteriService.search).mockResolvedValue({ data: [] } as never);
});

describe('İş Emri formu: müşteri adı serbest metin alanı', () => {
  test('ad soyadı yazıp Enter ile onaylamak (listeden seçmeden) telefon ve adresi silmez', async () => {
    const user = userEvent.setup();
    render(<IsEmriForm />);
    await screen.findByText('Yeni İş Emri #104'); // fiş no yüklendi
    await user.type(screen.getByLabelText('Telefon'), '05550001122');
    await user.type(screen.getByLabelText('Adres'), 'Kadıköy');
    await user.type(screen.getByLabelText('Ad Soyad *'), 'Yeni Müşteri{Enter}');
    expect(screen.getByLabelText('Ad Soyad *')).toHaveValue('Yeni Müşteri');
    expect(screen.getByLabelText('Telefon')).toHaveValue('05550001122');
    expect(screen.getByLabelText('Adres')).toHaveValue('Kadıköy');
  });
});
