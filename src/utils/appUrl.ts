export const APP_BASE_URL = import.meta.env?.BASE_URL ?? '/';

export function getAppBaseUrl(origin: string): string {
  return new URL(APP_BASE_URL, origin).toString();
}
