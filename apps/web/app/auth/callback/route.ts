import { prisma } from '@/prisma/prisma'
import { createClient } from '@/utils/supabase/server-client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) {
      // Get the user from the session
      const { user } = data.session

      try {
        // Create or update the user in your database
        await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            name: user.user_metadata.full_name,
            avatar: user.user_metadata.avatar_url,
            updatedAt: new Date(),
          },
          create: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata.full_name,
            avatar: user.user_metadata.avatar_url,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      } catch (error) {
        //logout user
        await supabase.auth.signOut()
        console.error('Error creating or updating user:', error)
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`)
  }

  // URL to redirect to after sign up process completes
  return NextResponse.redirect(`${origin}/dashboard`)
}
