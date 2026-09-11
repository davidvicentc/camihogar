export function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
export function safeAdminDestination(value: string | null) {
  return value && /^\/admin(?:\/|$)/.test(value) && !/[\\\r\n]/.test(value) && !value.startsWith("/admin/login") ? value : "/admin";
}
