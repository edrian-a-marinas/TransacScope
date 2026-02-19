// src/schemas/register.ts
import { z } from "zod"

// Validate phone number: starts with 09 and 9 digits after
const phoneRegex = /^09\d{9}$/

export const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),

  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(72),

  firstName: z
    .string()
    .min(1, { message: "First name required" })
    .max(50),

  middleName: z
    .string()
    .max(50)
    .optional()
    .or(z.literal("")), // allow empty string safely

  lastName: z
    .string()
    .min(1, { message: "Last name required" })
    .max(50),

  phoneNumber: z
    .string()
    .length(11)
    .regex(phoneRegex, { message: "Invalid phone number" }),
})

export type RegisterForm = z.infer<typeof registerSchema>

export function validateRegister(form: RegisterForm) {
  const result = registerSchema.safeParse(form)
  if (result.success) return []

  return result.error.issues.map(issue => issue.message)
}
