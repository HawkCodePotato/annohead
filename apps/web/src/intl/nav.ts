import { createNavigation } from 'next-intl/navigation'

import { routing } from '.'

export const {
  Link: NavLink,
  redirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing)
