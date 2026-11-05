import parse, { Element, type HTMLReactParserOptions } from 'html-react-parser'

import { Icon } from './icon'

type Props = {
  children: string
  className?: string
}

const options: HTMLReactParserOptions = {
  // game text inlines icons by their CDN path (transform.py inline_icons)
  replace: (node) => {
    if (node instanceof Element && node.name === 'img' && node.attribs.src) {
      return (
        <Icon
          className="inline size-[1.25em] align-text-bottom"
          icon={node.attribs.src}
        />
      )
    }
  },
}

export function Html({ children, className }: Props) {
  const html = children.replaceAll('<br/>', '')

  return <span className={className}>{parse(html, options)}</span>
}
