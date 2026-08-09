const normalizeRoute = (route: string) => (route.startsWith('/') ? route : `/${route}`)

export const getAppRootPath = () => {
  const basePath = String(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  return basePath || ''
}

export const getAppHashHref = (route: string) =>
  `${getAppRootPath()}/#${normalizeRoute(route)}`
