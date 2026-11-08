import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexReactClient } from 'convex/react'

import { queryClient } from './query'

export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)

export const convexQueryClient = new ConvexQueryClient(convex)

convexQueryClient.connect(queryClient)
