export interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const SYMBOL_RE = /[!@#$%^&*(),.?":{}|<>~`\-_=+[\]\\/;']/

export const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'At least one number', test: (p) => /[0-9]/.test(p) },
  { label: 'At least one symbol (!@#$%...)', test: (p) => SYMBOL_RE.test(p) },
]

export function passwordMeetsRequirements(password: string) {
  return passwordRequirements.every((r) => r.test(password))
}
