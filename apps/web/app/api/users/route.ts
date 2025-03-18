import { NextResponse } from 'next/server'
import { prisma } from '@/prisma/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, avatar } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { email },
    })

    // If user doesn't exist, create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar,
        },
      })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error managing user:', error)
    return NextResponse.json(
      { error: 'Failed to manage user' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
