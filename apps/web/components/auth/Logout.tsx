'use client'

import { useAuth } from './AuthProvider'

const Logout = () => {
  const { handleLogout } = useAuth()
  return (
    <div>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}

export default Logout
