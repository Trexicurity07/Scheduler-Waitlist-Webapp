import type { CSSProperties } from 'react'

// Single source of truth — copy of business-login styles applied everywhere.

export const colors = {
  pageBg: '#0f172a',
  surface: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.12)',
  textPrimary: '#f8fafc',
  textLabel: '#cbd5e1',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#3b82f6',
  accentSky: '#0ea5e9',
  errorBg: 'rgba(239,68,68,0.1)',
  errorBorder: 'rgba(239,68,68,0.25)',
  errorText: '#fca5a5',
} as const

export const inputStyle: CSSProperties = {
  padding: '0.625rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${colors.inputBorder}`,
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: colors.pageBg,
  color: colors.textPrimary,
}

export const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: colors.textLabel,
}

// Slightly smaller variant for dashboard forms inside cards
export const smallInputStyle: CSSProperties = {
  ...inputStyle,
  padding: '0.5rem 0.75rem',
  colorScheme: 'dark',
}

export const smallLabelStyle: CSSProperties = {
  ...labelStyle,
  fontSize: '0.8rem',
}

export const cardStyle: CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: '10px',
  padding: '1.25rem',
}

export const pageWrapperStyle: CSSProperties = {
  maxWidth: '400px',
  margin: '6rem auto',
  padding: '0 1.5rem',
}

export const h1Style: CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: colors.textPrimary,
  margin: '0.75rem 0 0.25rem',
}

export const subtitleStyle: CSSProperties = {
  color: colors.textMuted,
  fontSize: '0.875rem',
}

export const primaryBtnStyle: CSSProperties = {
  padding: '0.675rem',
  backgroundColor: colors.accent,
  color: '#fff',
  border: 'none',
  borderRadius: '7px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  width: '100%',
}

export const primarySkyBtnStyle: CSSProperties = {
  ...primaryBtnStyle,
  backgroundColor: colors.accentSky,
}

export const ghostBtnStyle: CSSProperties = {
  padding: '0.4rem 0.875rem',
  backgroundColor: 'transparent',
  color: colors.textSecondary,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: '6px',
  fontSize: '0.8rem',
  cursor: 'pointer',
}

export const showPasswordBtnStyle: CSSProperties = {
  position: 'absolute',
  right: '0.625rem',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  color: colors.textMuted,
  fontSize: '0.75rem',
  cursor: 'pointer',
  padding: '0.25rem',
}

export const errorAlertStyle: CSSProperties = {
  backgroundColor: colors.errorBg,
  border: `1px solid ${colors.errorBorder}`,
  color: colors.errorText,
  borderRadius: '8px',
  padding: '0.875rem 1rem',
  fontSize: '0.875rem',
}

export const hintTextStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: colors.textSecondary,
  fontWeight: 400,
}
