export const SESSION_COOKIE_NAME = 'indah_crm_session';
export const SESSION_REFRESH_COOKIE_NAME = 'indah_crm_refresh';
export const PRIMARY_ADMIN_EMAIL = 'manavsinghal@gmail.com';
export const SESSION_MAX_AGE_SECONDS = 50 * 60;
export const SESSION_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isPrimaryAdmin(email: string) {
  return normalizeEmail(email) === PRIMARY_ADMIN_EMAIL;
}
