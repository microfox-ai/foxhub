'use client'

import { useAuth } from './AuthProvider'

const Login = () => {
  const { handleSigninWithGoogle } = useAuth()
  return (
    <div>
      <button onClick={handleSigninWithGoogle}>Signin</button>
    </div>
  )
}

export default Login
