import { type SearchType } from '@anno/db/search'

export const navigation = [
  {
    href: '/calculator',
    key: 'calculator',
  },
  {
    href: '/buildings',
    key: 'building',
  },
  {
    href: '/chains',
    key: 'chain',
  },
  {
    href: '/items',
    key: 'item',
  },
  {
    href: '/products',
    key: 'product',
  },
  {
    href: '/quests',
    key: 'quest',
  },
  {
    href: '/techs',
    key: 'tech',
  },
  {
    href: '/units',
    key: 'unit',
  },
  {
    href: '/ornaments',
    key: 'ornament',
  },
] as const

export function getUrl(type: SearchType, id: number, slug?: string | null) {
  const base =
    type === 'building'
      ? 'buildings'
      : type === 'chain'
        ? 'chains'
        : type === 'item'
          ? 'items'
          : type === 'product'
            ? 'products'
            : type === 'quest'
              ? 'quests'
              : type === 'unit'
                ? 'units'
                : type === 'ornament'
                  ? 'ornaments'
                  : 'techs'

  return `/${base}/${id}/${slug ?? type}`
}

// only same-site paths, so ?next can't send people to another site
export function getSafeNext(value: unknown) {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
    ? value
    : '/'
}

export function getAuthHref(
  pathname: '/auth/sign-in' | '/auth/sign-up',
  next: string,
) {
  return next === '/' ? pathname : { pathname, query: { next } }
}
