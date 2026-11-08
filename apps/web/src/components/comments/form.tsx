import { api } from '@anno/convex'
import { useConvexMutation } from '@convex-dev/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Controller, useForm } from 'react-hook-form'
import { useHotkeys } from 'react-hotkeys-hook'
import { z } from 'zod'

import { Button } from '../common/button'

const schema = z.object({
  body: z.string().min(1),
  guid: z.number(),
})

type Props = {
  guid: number
  onSuccess?: () => void
}

export function CommentForm({ guid, onSuccess }: Props) {
  const t = useTranslations('component.comments.form')

  useHotkeys(
    'meta+enter',
    () => {
      onSubmit()
    },
    {
      enableOnFormTags: true,
    },
  )

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      body: '',
      guid,
    },
    resolver: zodResolver(schema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.comments.mutations.create),
    onSuccess() {
      reset()

      onSuccess?.()
    },
  })

  const onSubmit = handleSubmit((data) => {
    if (isPending) {
      return
    }

    mutate(data)
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <Controller
        control={control}
        name="body"
        render={({ field }) => (
          <textarea
            {...field}
            className="bg-gray-2 ring-accent-8 field-sizing-content max-h-64 min-h-16 w-full resize-none rounded-lg px-4 py-3 outline-none focus-visible:ring-2"
            placeholder={t('field.body.placeholder')}
          />
        )}
      />

      <Button className="self-end" loading={isPending} type="submit">
        {t('action.submit')}
      </Button>
    </form>
  )
}
