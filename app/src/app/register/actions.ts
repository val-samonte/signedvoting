'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .regex(/^[a-zA-Z0-9]+$/, 'Username must contain only alphanumeric characters and no spaces')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, 
      'Password must contain at least 1 letter, 1 number, and 1 symbol'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function registerUser(formData: {
  username: string
  password: string
  confirmPassword: string
}) {
  try {
    // Validate form data
    const validatedData = registerSchema.parse(formData)

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username }
    })

    if (existingUser) {
      return {
        success: false,
        errors: ['Username already exists']
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        password: hashedPassword,
        wallet_address: null
      },
      select: {
        id: true,
        username: true,
        wallet_address: true
      }
    })

    return {
      success: true,
      user
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => err.message)
      }
    }

    // Handle database errors
    if (error instanceof Error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return {
          success: false,
          errors: ['Username already exists']
        }
      }
    }

    return {
      success: false,
      errors: ['An unexpected error occurred during registration']
    }
  }
}
