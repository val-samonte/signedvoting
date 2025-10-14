'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required'),
  password: z
    .string()
    .min(1, 'Password is required')
})

export async function loginUser(formData: {
  username: string
  password: string
}) {
  try {
    // Validate form data
    const validatedData = loginSchema.parse(formData)

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: validatedData.username }
    })

    if (!user) {
      return {
        success: false,
        errors: ['Invalid username or password']
      }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password)

    if (!isPasswordValid) {
      return {
        success: false,
        errors: ['Invalid username or password']
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        wallet_address: user.wallet_address
      }
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => err.message)
      }
    }

    console.error('Login error:', error)
    return {
      success: false,
      errors: ['An unexpected error occurred during login']
    }
  }
}
