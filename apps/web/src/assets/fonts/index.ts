import localFont from 'next/font/local'

export const text = localFont({
  display: 'swap',
  src: [
    {
      path: './text-upright.ttf',
      weight: '100 900',
    },
    {
      path: './text-italic.ttf',
      style: 'italic',
      weight: '100 900',
    },
  ],
  variable: '--font-text',
})

export const code = localFont({
  display: 'swap',
  src: [
    {
      path: './code-upright.ttf',
      weight: '100 900',
    },
    {
      path: './code-italic.ttf',
      style: 'italic',
      weight: '100 900',
    },
  ],
  variable: '--font-code',
})
