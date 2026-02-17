// Email validation pattern (simple, matches general email format)
export type EmailStr = string;

// Password constraints: 8-72 chars (same as backend)
export type PasswordStr = string;

export interface LoginForm {
  email: EmailStr;
  password: PasswordStr;
}

// Conditional Data validations
export function validateLogin(data: LoginForm): string[] {
  const errors: string[] = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    errors.push("Invalid email format");
  }

  if (data.password.length < 8 || data.password.length > 72) {
    errors.push("Password must be between 8 and 72 characters");
  }

  return errors;
}
