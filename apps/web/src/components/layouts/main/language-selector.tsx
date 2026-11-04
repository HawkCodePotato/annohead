'use client'

import { Menu } from '@base-ui/react/menu'
import Image from 'next/image'
import { useLocale } from 'next-intl'

import { routing } from '@/intl'
import { flags, names } from '@/intl/data'
import { NavLink, usePathname } from '@/intl/nav'

export function LanguageSelector() {
  const path = usePathname()
  const locale = useLocale()

  return (
    <Menu.Root>
      <Menu.Trigger className="ring-accent-8 data-popup-open:bg-gray-3 flex size-10 items-center justify-center rounded-lg outline-none focus-visible:ring-2 data-popup-open:rounded-b-none">
        <Image
          alt={locale}
          className="size-6"
          height={16}
          src={`https://flags.willa.app/flags/${flags[locale]}.svg`}
          unoptimized
          width={16}
        />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner align="end" className="outline-hidden" side="bottom">
          <Menu.Popup className="bg-gray-3 overflow-hidden rounded-tl-lg rounded-b-lg outline-hidden">
            <Menu.RadioGroup value={locale}>
              {routing.locales.map((item) => (
                <Menu.RadioItem
                  className="data-highlighted:bg-accent-4 flex items-center gap-2 p-3 text-sm leading-tight font-medium outline-none"
                  key={item}
                  render={<NavLink href={path} locale={item} />}
                  value={item}
                >
                  <Image
                    alt={item}
                    className="size-4"
                    height={16}
                    src={`https://flags.willa.app/flags/${flags[item]}.svg`}
                    unoptimized
                    width={16}
                  />

                  {names[item]}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
