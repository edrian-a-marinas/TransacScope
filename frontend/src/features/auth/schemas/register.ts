// src/schemas/register.ts
import { z } from "zod"

// Validate phone number: starts with 09 and 9 digits after
const phoneRegex = /^09\d{9}$/

const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/

export const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),

  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(72),

  firstName: z
    .string()
    .min(1, { message: "First name required" })
    .max(50)
    .refine(val => nameRegex.test(val), { message: "First name cannot contain numbers or special characters" }),

  middleName: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(""))
    .refine(val => !val || nameRegex.test(val), { message: "Middle name cannot contain numbers or special characters" }),

  lastName: z
    .string()
    .min(1, { message: "Last name required" })
    .max(50)
    .refine(val => nameRegex.test(val), { message: "Last name cannot contain numbers or special characters" }),

  phoneNumber: z
    .string()
    .optional()
    .refine(
      val => !val || phoneRegex.test(val),
      { message: "Invalid phone number, must be 11 digits and starts with 09" }
    )
})

export type RegisterForm = z.infer<typeof registerSchema>

export function validateRegister(form: RegisterForm) {
  const result = registerSchema.safeParse(form)
  if (result.success) return []

  return result.error.issues.map(issue => issue.message)
}
