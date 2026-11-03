/*
 * Rota yetkileri: menüde gösterme (Layout) ve rota guard'ı (App) AYNI kuralı kullanır; kural iki yerde ayrı yazılınca ayrışıyordu
 * (Taksit Hesaplama menüde gizliydi ama adresle açılabiliyordu). Bu dosya yalnız arayüz kolaylığıdır: güvenlik sunucudadır.
 */

/** Taksit Hesaplama: yatırımcı ve muhasebeci göremez. Sayfanın sunucu ucu yoktur (hesap tarayıcıda). */
export const taksitGorebilirMi = (user: { rol?: string } | null | undefined): boolean => !!user && user.rol !== 'yatirimci' && user.rol !== 'muhasebeci';
