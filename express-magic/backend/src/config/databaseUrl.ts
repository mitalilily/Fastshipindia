const DATABASE_URL_KEYS = [
  'DATABASE_URL',
  'DATABASE_INTERNAL_URL',
  'DATABASE_PUBLIC_URL',
  'POSTGRES_URL',
] as const

const PROVIDER_REFERENCE_PATTERN = /^\$\{\{[^}]+\}\}$/
const PLACEHOLDER_HOSTS = new Set(['base', 'internal-host', 'host'])

const normalizeValue = (value: string | undefined) =>
  String(value || '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')

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
    if (value && validateDatabaseUrl(value)) return value
  }

  throw new Error(
    'No valid PostgreSQL connection URL is configured. In Render, set DATABASE_URL to the Internal Database URL from the Postgres Connect menu; unresolved Railway references such as ${{base.DATABASE_URL}} are not valid on Render.',
  )
}

