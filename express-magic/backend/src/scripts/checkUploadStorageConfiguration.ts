import assert from 'assert/strict'
import {
  assertStorageConfigured,
  getBucketName,
  getMissingStorageConfiguration,
  isStorageConfigurationError,
} from '../utils/functions'

const storageKeys = [
  'NODE_ENV',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'PROD_BUCKET',
  'STAGING_BUCKET',
  'DEV_BUCKET',
  'R2_BUCKET_NAME',
  'R2_BUCKET',
  'BUCKET_NAME',
] as const

const previousValues = Object.fromEntries(storageKeys.map((key) => [key, process.env[key]]))

try {
  for (const key of storageKeys) delete process.env[key]
  process.env.NODE_ENV = 'production'

  assert.deepEqual(getMissingStorageConfiguration(), [
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'PROD_BUCKET (or R2_BUCKET_NAME)',
  ])

  assert.throws(
    () => assertStorageConfigured(),
    (error: unknown) =>
      isStorageConfigurationError(error) &&
      error.missingKeys.includes('PROD_BUCKET (or R2_BUCKET_NAME)'),
  )
  assert.throws(() => getBucketName(), isStorageConfigurationError)

  process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com/'
  process.env.R2_ACCESS_KEY_ID = 'test-access-key'
  process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key'
  process.env.R2_BUCKET_NAME = 'fastship-test'

  assert.deepEqual(getMissingStorageConfiguration(), [])
  assert.doesNotThrow(() => assertStorageConfigured())
  assert.equal(getBucketName(), 'fastship-test')

  process.env.PROD_BUCKET = 'fastship-production'
  assert.equal(getBucketName(), 'fastship-production')

  console.log('Upload storage configuration checks passed.')
} finally {
  for (const key of storageKeys) {
    const previous = previousValues[key]
    if (previous === undefined) delete process.env[key]
    else process.env[key] = previous
  }
}
