import { cn } from 'cn'

type Props = {
  className?: string
}

export function Logo({ className }: Props) {
  return (
    <svg
      className={cn('text-accent-9 aspect-[calc(49/36)]', className)}
      fill="currentColor"
      viewBox="0 0 49 36"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Annohead</title>

      <path d="M33.1186 35.5H48.5169L33.9456 10.7891C32.5028 8.34245 32.6241 5.27704 34.2555 2.95219L35.9764 0.5H13.0239L14.7447 2.95219C16.3762 5.27705 16.4975 8.34245 15.0547 10.7891L0.483398 35.5H15.8817L14.2994 31.1412C13.5718 29.1368 13.7646 26.9132 14.8263 25.0643L24.5001 8.21794L34.174 25.0643C35.2357 26.9132 35.4285 29.1368 34.7009 31.1412L33.1186 35.5Z" />
    </svg>
  )
}
