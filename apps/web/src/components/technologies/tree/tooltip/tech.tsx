'use client'

import { type Techs } from '@anno/db/client'
import { useFormatter, useTranslations } from 'next-intl'

import { Icon } from '@/components/common/icon'
import { getIcon } from '@/lib/icons'
import { getUrl } from '@/lib/url'

import { Header } from './header'
import { Row } from './row'
import { Section } from './section'

type Props = {
  tech: Techs[number]
}

export function TechCard({ tech }: Props) {
  const t = useTranslations('component.technologies.tree')
  const f = useFormatter()

  return (
    <>
      <Header
        description={tech.description}
        icon={tech.icon}
        subtitle={tech.isGate ? t('inspiration') : t('discovery')}
        title={tech.name}
      />

      {tech.unlocks.length > 0 ? (
        <Section title={t('unlocks')}>
          {tech.unlocks.map((item) => (
            <Row
              description={item.description}
              href={
                item.buildingGuid
                  ? getUrl('building', item.buildingGuid, item.slug)
                  : undefined
              }
              icon={item.icon}
              key={item.guid}
              name={item.name}
            />
          ))}
        </Section>
      ) : null}

      {tech.effects.length > 0 ? (
        <Section title={t('effects')}>
          {tech.effects.map((effect) => (
            <div className="flex flex-col gap-2" key={effect.guid}>
              <Row description={effect.description} name={effect.name} />

              {effect.modifiers.map((modifier) => (
                <div
                  className="flex justify-between gap-4 text-sm"
                  key={`${modifier.buffGuid}:${modifier.attribute}:${modifier.path}`}
                >
                  <div className="font-bold">
                    {modifier.productName ?? modifier.name}
                  </div>

                  {modifier.value ? (
                    <div className="tabular-nums">
                      {f.number(
                        modifier.isPercent
                          ? modifier.value / 100
                          : modifier.value,
                        {
                          signDisplay: 'always',
                          style: modifier.isPercent ? 'percent' : undefined,
                        },
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </Section>
      ) : null}

      {tech.resources.length > 0 ? (
        <Section title={t('rewards')}>
          {tech.resources.map((resource) => (
            <div
              className="flex justify-between gap-4 text-sm"
              key={resource.guid}
            >
              <div className="font-bold">{resource.name}</div>

              {resource.amount ? (
                <div className="tabular-nums">
                  {f.number(resource.amount, {
                    signDisplay: 'always',
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </Section>
      ) : null}

      {tech.knowledgeNeeded ? (
        <div className="flex justify-between gap-4 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Icon className="size-5" icon={getIcon('attribute.Knowledge')} />

            <div>{t('knowledge')}</div>
          </div>

          <div>
            {f.number(tech.knowledgeNeeded, {
              notation: 'compact',
            })}
          </div>
        </div>
      ) : null}
    </>
  )
}
