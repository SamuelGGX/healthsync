// Base URL del backend. Por defecto usa ruta relativa /api (nginx hace proxy
// al servicio backend dentro de la red de Docker). Para apuntar a otro host
// en build time, definir VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL ?? '/api'
