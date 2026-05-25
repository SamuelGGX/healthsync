import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const AuthContext = createContext(null)
const API_URL = `http://${window.location.hostname}:3000`

// Refrescamos el access token cada 20 min. Como el access vive 30 min,
// nos quedan 10 min de margen para que nunca expire mientras el usuario navega.
const REFRESH_INTERVAL_MS = 20 * 60 * 1000

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken]   = useState(() => localStorage.getItem('accessToken'))
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  // Necesitamos un ref para que refreshAccess use siempre el último refreshToken
  // sin tener que recrearse cuando el access cambia.
  const refreshTokenRef = useRef(refreshToken)
  useEffect(() => { refreshTokenRef.current = refreshToken }, [refreshToken])

  const clearAll = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }, [])

  const login = useCallback((newAccessToken, newRefreshToken, newUser) => {
    localStorage.setItem('accessToken',  newAccessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
    localStorage.setItem('user',         JSON.stringify(newUser))
    setAccessToken(newAccessToken)
    setRefreshToken(newRefreshToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(async () => {
    const rt = refreshTokenRef.current
    if (rt) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken: rt }),
        })
      } catch {
        // ignore: si falla el backend, igual limpiamos local
      }
    }
    clearAll()
  }, [clearAll])

  const refreshAccess = useCallback(async () => {
    const rt = refreshTokenRef.current
    if (!rt) return null
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) {
        // El refresh ya no vale: forzar logout local
        clearAll()
        return null
      }
      const data = await res.json()
      localStorage.setItem('accessToken', data.accessToken)
      setAccessToken(data.accessToken)
      return data.accessToken
    } catch {
      return null
    }
  }, [clearAll])

  // Auto-refresh: cada 20 min mientras haya refresh token.
  // También intenta refrescar al montar (por si el access que tenemos guardado
  // ya expiró desde la última visita).
  useEffect(() => {
    if (!refreshToken) return

    refreshAccess()
    const id = setInterval(refreshAccess, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken])

  return (
    <AuthContext.Provider value={{
      accessToken,
      refreshToken,
      user,
      login,
      logout,
      refreshAccess,
      // Alias para no romper componentes que ya usan `token`
      token: accessToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
