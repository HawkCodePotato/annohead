import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

import { type NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/intl/request.ts')

function lastCommitDate() {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI']).toString().trim()
  } catch {
    return new Date().toISOString()
  }
}

const config: NextConfig = {
  env: {
    LAST_UPDATED: lastCommitDate(),
  },
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  outputFileTracingIncludes: {
    '/*': ['../../packages/db/anno.sqlite'],
  },
  outputFileTracingRoot: resolve(import.meta.dirname, '../..'),
  serverExternalPackages: ['@libsql/client'],
  transpilePackages: ['@anno/db'],
}

export default withNextIntl(config)
