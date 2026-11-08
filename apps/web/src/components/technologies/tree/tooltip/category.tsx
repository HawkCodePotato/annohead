import { type TechCategories } from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { Html } from '@/components/common/html'

import { Header } from './header'
import { Section } from './section'

type Props = {
  category: TechCategories[number]
}

export function CategoryCard({ category }: Props) {
  const t = useTranslations('component.technologies.tree')

  return (
    <>
      <Header
        description={category.description}
        icon={category.icon}
        title={category.gate?.name ?? category.name}
      />

      {category.gate?.description ? (
        <Section title={t('requirement')}>
          <Html className="text-sm">{category.gate.description}</Html>
        </Section>
      ) : null}
    </>
  )
}
