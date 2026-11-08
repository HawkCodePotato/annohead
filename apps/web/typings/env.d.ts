/** biome-ignore-all lint/style/noNamespace: go away */
/** biome-ignore-all lint/style/useConsistentTypeDefinitions: go away */

declare namespace NodeJS {
  export interface ProcessEnv {
    LAST_UPDATED: string
    NEXT_PUBLIC_CDN_URL: string
    NEXT_PUBLIC_CONVEX_URL: string
  }
}
