const DATABASE_URL_KEYS = [
  'DATABASE_PUBLIC_URL',
  'DATABASE_EXTERNAL_URL',
  'POSTGRES_EXTERNAL_URL',
  'POSTGRES_PUBLIC_URL',
  'DATABASE_URL',
  'DATABASE_INTERNAL_URL',
  'POSTGRES_URL',
] as const

const PROVIDER_REFERENCE_PATTERN = /^\$\{\{[^}]+\}\}$/
const PLACEHOLDER_HOSTS = new Set(['base', 'internal-host', 'host'])

const normalizeValue = (value: string | undefined) =>
  String(value || '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')

const externalizeRenderPostgresHost = (value: string, environment: NodeJS.ProcessEnv) => {
  try {
    const url = new URL(value)
    const isBareRenderInternalHost = /^dpg-[a-z0-9-]+-[a-z0-9]+$/i.test(url.hostname)
    const shouldUsePublicHost =
      isBareRenderInternalHost &&
      (environment.NODE_ENV === 'production' || Boolean(environment.RENDER_EXTERNAL_HOSTNAME))

    if (!shouldUsePublicHost) return value

    const region = normalizeValue(environment.RENDER_POSTGRES_REGION || 'oregon').toLowerCase()
    url.hostname = `${url.hostname}.${region}-postgres.render.com`
    return url.toString()
  } catch {
    return value
  }
}

const validateDatabaseUrl = (value: string) => {
  if (PROVIDER_REFERENCE_PATTERN.test(value)) return false

  try {
    const url = new URL(value)
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !PLACEHOLDER_HOSTS.has(url.hostname.toLowerCase())
    )
  } catch {
    return false
  }
}

export const resolveDatabaseUrl = (
  environment: NodeJS.ProcessEnv = process.env,
): string => {
  for (const key of DATABASE_URL_KEYS) {
    const value = normalizeValue(environment[key])
    if (value && validateDatabaseUrl(value)) {
      return externalizeRenderPostgresHost(value, environment)
    }
  }

  throw new Error(
    'No valid PostgreSQL connection URL is configured. In Render, set DATABASE_PUBLIC_URL or DATABASE_EXTERNAL_URL to the reachable External Database URL, or set DATABASE_URL to a reachable database URL. Unresolved provider references such as ${{base.DATABASE_URL}} are not valid on Render.',
  )
}

