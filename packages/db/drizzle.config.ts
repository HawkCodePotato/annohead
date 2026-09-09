import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url: 'file:anno.sqlite',
  },
  dialect: 'sqlite',
  introspect: {
    casing: 'camel',
  },
  out: './src',
  schema: './src/schema.ts',
})
