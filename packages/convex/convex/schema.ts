import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  comments: defineTable({
    body: v.string(),
    guid: v.number(),
    userId: v.id('users'),
  })
    .index('by_guid', ['guid'])
    .index('by_user', ['userId']),
  users: defineTable({
    // empty for a moment after a password sign up, until users.internal.syncUsername runs
    username: v.optional(v.string()),
  }),
})
