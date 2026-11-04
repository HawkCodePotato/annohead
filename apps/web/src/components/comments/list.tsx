'use client'

import { api } from '@anno/convex'
import { useConvexAuth } from '@convex-dev/auth/react'
import { PlusCircleIcon, XCircleIcon } from '@phosphor-icons/react/dist/ssr'
import { usePaginatedQuery } from 'convex/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { NavLink } from '@/intl/nav'

import { Button } from '../common/button'
import { Empty } from '../common/empty'
import { IconButton } from '../common/icon-button'
import { Spinner } from '../common/spinner'
import { CommentCard } from './card'
import { CommentForm } from './form'

type Props = {
  guid: number
}

export function CommentList({ guid }: Props) {
  const t = useTranslations('component.comments.list')

  const { isAuthenticated } = useConvexAuth()

  const [visible, setVisible] = useState(false)

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.comments.queries.list,
    {
      guid,
    },
    {
      initialNumItems: 100,
    },
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <h2 className="text-2xl">{t('title')}</h2>

        {isAuthenticated ? (
          <IconButton
            className="size-8"
            onClick={() => {
              setVisible((previous) => !previous)
            }}
          >
            {visible ? (
              <XCircleIcon className="size-6" />
            ) : (
              <PlusCircleIcon className="size-6" />
            )}
          </IconButton>
        ) : null}
      </div>

      {isAuthenticated ? null : (
        <p className="text-gray-11 -mt-2 text-sm">
          {t.rich('signIn', {
            link: (text) => (
              <NavLink className="text-accent-11" href="/auth/sign-in">
                {text}
              </NavLink>
            ),
          })}
        </p>
      )}

      {visible ? (
        <CommentForm
          guid={guid}
          onSuccess={() => {
            setVisible(false)
          }}
        />
      ) : null}

      {results.length ? (
        <div className="flex flex-col gap-4">
          {results.map((comment) => (
            <CommentCard comment={comment} key={comment._id} />
          ))}
        </div>
      ) : isLoading ? null : (
        <Empty>{t('empty')}</Empty>
      )}

      {status === 'LoadingFirstPage' ? (
        <Spinner className="size-8" />
      ) : status === 'LoadingMore' ? (
        <Spinner className="size-4" />
      ) : status === 'CanLoadMore' ? (
        <Button
          onClick={() => {
            loadMore(100)
          }}
        >
          {t('more')}
        </Button>
      ) : null}
    </div>
  )
}
