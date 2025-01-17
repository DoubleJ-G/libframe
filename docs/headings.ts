import React from 'react'
import { getFrame } from './frame'
import { assert } from './utils'
import { Emoji, EmojiName } from './utils/Emoji'

export { getHeadings }
export { parseTitle }

export type Heading = Omit<HeadingDefinition, 'title' | 'titleInNav'> & {
  title: JSX.Element
  titleInNav: JSX.Element
  parentHeadings: Heading[]
  // Not sure why this is needed
  isListTitle?: true
}
export type HeadingWithoutLink = {
  url: string
  title: string | JSX.Element
}
export type HeadingDefinition = HeadingBase &
  (
    | ({ level: 1; titleEmoji: EmojiName } & HeadingAbstract)
    | ({ level: 4 } & HeadingAbstract)
    | {
        level: 2
        isListTitle?: true
        url: string
      }
    | {
        level: 3
        url: string
      }
  )
type HeadingBase = {
  title: string
  level: number
  url?: string
  titleDocument?: string
  titleInNav?: string
  // titleSize?: string
}
type HeadingAbstract = {
  url?: undefined
  titleDocument?: undefined
  titleInNav?: undefined
}

let _getHeadingsResult: ReturnType<typeof getHeadings> | null = null
function getHeadings(): { headings: Heading[]; headingsWithoutLink: HeadingWithoutLink[] } {
  if (_getHeadingsResult) {
    return _getHeadingsResult
  }

  const headingsWithoutParent: Omit<Heading, 'parentHeadings'>[] = getFrame().headings.map(
    (heading: HeadingDefinition) => {
      const titleProcessed: JSX.Element = parseTitle(heading.title)

      const titleInNav = heading.titleInNav || heading.title
      let titleInNavProcessed: JSX.Element
      if ('isListTitle' in heading) {
        assert(heading.isListTitle === true)
        let titleParsed: JSX.Element = parseTitle(titleInNav)
        // if (heading.titleSize) {
        //   titleParsed = React.createElement('span', { style: { fontSize: heading.titleSize } }, titleParsed)
        // }
        titleInNavProcessed = React.createElement(React.Fragment, {}, [getListPrefix(), titleParsed])
      } else {
        titleInNavProcessed = parseTitle(titleInNav)
      }
      if ('titleEmoji' in heading) {
        assert(heading.titleEmoji)
        titleInNavProcessed = withEmoji(heading.titleEmoji, titleInNavProcessed)
      }

      const headingProcessed: Omit<Heading, 'parentHeadings'> = {
        ...heading,
        title: titleProcessed,
        titleInNav: titleInNavProcessed,
      }
      return headingProcessed
    },
  )

  const headings: Heading[] = []
  headingsWithoutParent.forEach((heading) => {
    const parentHeadings: Heading[] = []
    let levelCurrent = heading.level
    headings
      .slice()
      .reverse()
      .forEach((parentCandidate) => {
        if (parentCandidate.level < levelCurrent) {
          levelCurrent = parentCandidate.level
          parentHeadings.unshift(parentCandidate)
        }
      })
    headings.push({ ...heading, parentHeadings })
  })

  const headingsWithoutLink = getFrame().headingsWithoutLink
  headingsWithoutLink.forEach(({ url }) => {
    const heading = headings.find((heading) => heading.url === url)
    assert(heading === undefined, `remove ${url} from headingsWithoutLink`)
  })

  assertHeadingsUrl([...headings, ...headingsWithoutLink])
  return (_getHeadingsResult = { headings, headingsWithoutLink })
}

function assertHeadingsUrl(headings: { url?: string }[]) {
  const urls: Record<string, true> = {}
  headings.forEach((heading) => {
    if (heading.url) {
      const { url } = heading
      assert(url.startsWith('/'))
      assert(!urls[url], { url })
      urls[url] = true
    }
  })
}

function getListPrefix() {
  const nonBreakingSpace = String.fromCodePoint(0x00a0)
  const bulletPoint = String.fromCodePoint(0x2022)
  return nonBreakingSpace + bulletPoint + nonBreakingSpace
}

function parseTitle(title: string): JSX.Element {
  type Part = { nodeType: 'text' | 'code'; content: string }
  const parts: Part[] = []
  let current: Part | undefined
  title.split('').forEach((letter) => {
    if (letter === '`') {
      if (current?.nodeType === 'code') {
        // </code>
        parts.push(current)
        current = undefined
      } else {
        // <code>
        if (current) {
          parts.push(current)
        }
        current = { nodeType: 'code', content: '' }
      }
    } else {
      if (!current) {
        current = { nodeType: 'text', content: '' }
      }
      current.content += letter
    }
  })
  if (current) {
    parts.push(current)
  }

  const titleJsx = React.createElement(
    React.Fragment,
    {},
    ...parts.map((part) => {
      if (part.nodeType === 'code') {
        return React.createElement('code', {}, part.content)
      } else {
        assert(part.nodeType === 'text')
        return part.content
      }
    }),
  )

  return titleJsx
}

function withEmoji(name: EmojiName, title: string | JSX.Element): JSX.Element {
  const style = { fontSize: '1.4em' }
  //return React.createElement(React.Fragment, null, Emoji({ name, style }), ' ', title)
  return React.createElement(
    'span',
    { style },
    Emoji({ name }),
    ' ',
    React.createElement('span', { style: { fontSize: '1rem' } }, title),
  )
}
