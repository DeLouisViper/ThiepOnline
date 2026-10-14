export type WishStatus = 'pending' | 'approved' | 'hidden';

export interface Wish {
  id: string;
  guest_name: string;
  message: string;
  photo_path: string | null;
  status: WishStatus;
  created_at: string;
}

export interface GalleryPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

/** What the public site may read (view public_wedding_settings). */
export interface PublicSettings {
  music_enabled: boolean;
  music_url: string | null;
  petals_enabled: boolean;
  require_approval: boolean;
  allow_guest_photos: boolean;
  groom_qr_path: string | null;
  groom_bank_name: string | null;
  groom_account_number: string | null;
  groom_account_holder: string | null;
  bride_qr_path: string | null;
  bride_bank_name: string | null;
  bride_account_number: string | null;
  bride_account_holder: string | null;
  /** Editable invitation text (names, families, venue, timeline…). Validated by mergeContent(). */
  content: unknown;
}

/** Full row, admin only (table wedding_settings). */
export interface AdminSettings {
  id: number;
  music_enabled: boolean;
  music_url: string | null;
  petals_enabled: boolean;
  require_approval: boolean;
  allow_guest_photos: boolean;
  groom_qr_path: string | null;
  groom_bank_name: string | null;
  groom_account_number: string | null;
  groom_account_holder: string | null;
  groom_show_bank: boolean;
  bride_qr_path: string | null;
  bride_bank_name: string | null;
  bride_account_number: string | null;
  bride_account_holder: string | null;
  bride_show_bank: boolean;
  content: unknown;
}

export const DEFAULT_SETTINGS: PublicSettings = {
  music_enabled: false,
  music_url: null,
  petals_enabled: true,
  require_approval: true,
  allow_guest_photos: false,
  groom_qr_path: null,
  groom_bank_name: null,
  groom_account_number: null,
  groom_account_holder: null,
  bride_qr_path: null,
  bride_bank_name: null,
  bride_account_number: null,
  bride_account_holder: null,
  content: null,
};
