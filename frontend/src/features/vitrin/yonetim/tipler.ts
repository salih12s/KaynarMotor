/** Vitrin yönetim ekranının bildirim (snackbar) işlevi: mesaj ve isteğe bağlı önem (varsayılan: başarılı). */
export type BildirimTuru = 'success' | 'error' | 'warning' | 'info';
export type Bildir = (mesaj: string, tur?: BildirimTuru) => void;
