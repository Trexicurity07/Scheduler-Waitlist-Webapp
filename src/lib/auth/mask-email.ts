export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const visible = local.slice(0, Math.min(3, local.length))
  const stars = '*'.repeat(Math.max(0, local.length - visible.length))
  return visible + stars + domain
}
