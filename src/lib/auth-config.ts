export const SESSION_COOKIE_NAME = 'indah_crm_session';
export const PRIMARY_ADMIN_EMAIL = 'manavsinghal@gmail.com';
export const SESSION_MAX_AGE_SECONDS = 60 * 60;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isPrimaryAdmin(email: string) {
  return normalizeEmail(email) === PRIMARY_ADMIN_EMAIL;
}
