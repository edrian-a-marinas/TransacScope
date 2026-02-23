import { z } from "zod"

// Conditional Data validations
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(72, { message: "Password must not exceed 72 characters." }),
})

export type LoginForm = z.infer<typeof loginSchema>

export function validateLogin(data: LoginForm): string[] {
  const result = loginSchema.safeParse(data)
  if (result.success) return []

  return result.error.issues.map(issue => issue.message)
}