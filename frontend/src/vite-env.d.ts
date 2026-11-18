/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ENABLE_PURCHASE?: string;
  readonly VITE_ENABLE_DELIVERY?: string;
  readonly VITE_ENABLE_CARD_PAY?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}
