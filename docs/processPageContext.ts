import { assert, checkType, jsxToTextContent, objectAssign } from './utils'
import { getHeadings, parseTitle } from './headings'
import { getFrame } from './frame'
import type { Heading } from './headings'
import type { PageContextBuiltIn } from 'vite-plugin-ssr/types'
import type { HeadingExtracted } from './vite.config/vite-plugin-mdx-export-headings'

export { processPageContext }
export type { PageContextOriginal }
export type { Heading }

type ReactComponent = () => JSX.Element
type PageExports = {
  headings?: HeadingExtracted[]
  noHeading?: true
  pageTitle?: string
}
type PageContextOriginal = PageContextBuiltIn & {
  Page: ReactComponent
  pageExports: PageExports
}

type PageContextAfterProcess = {
  meta: {
    title: string
    logoUrl: string
  }
  activeHeading: Heading | null
  headings: Heading[]
  isLandingPage: boolean
  pageTitle: string | JSX.Element | null
}

function processPageContext(
  pageContext: PageContextOriginal
): asserts pageContext is PageContextOriginal & PageContextAfterProcess {
  const headings = getHeadings()
  objectAssign(pageContext, { headings })
  const activeHeading = findActiveHeading(headings, pageContext)
  addSubHeadings(headings, pageContext, activeHeading)
  const { title, isLandingPage, pageTitle } = getMetaData(activeHeading, pageContext)
  const { logoUrl } = getFrame()
  objectAssign(pageContext, {
    meta: {
      title,
      logoUrl
    },
    activeHeading,
    headings,
    isLandingPage,
    pageTitle
  })
  checkType<PageContextOriginal & PageContextAfterProcess>(pageContext)
}

function getMetaData(activeHeading: Heading | null, pageContext: { url: string; pageExports: PageExports }) {
  const { url, pageExports } = pageContext
  const isLandingPage = url === '/'

  let title: string
  let pageTitle: string | JSX.Element | null
  if (pageExports.pageTitle) {
    title = pageExports.pageTitle
    pageTitle = title
  } else if (!activeHeading) {
    title = url.slice(1)
    assert(!title.startsWith('/'))
    pageTitle = null
  } else {
    title = activeHeading.titleDocument || jsxToTextContent(activeHeading.title)
    pageTitle = activeHeading.title
  }

  if (!isLandingPage) {
    title += ' | ' + getFrame().projectName
  }

  if (isLandingPage) {
    pageTitle = null
  }

  return { title, isLandingPage, pageTitle }
}

function findActiveHeading(
  headings: Heading[],
  pageContext: { url: string; pageExports: PageExports }
): Heading | null {
  let activeHeading: Heading | null = null
  assert(pageContext.url)
  headings.forEach((heading) => {
    if (heading.url === pageContext.url) {
      activeHeading = heading
      assert(heading.level === 2)
      heading.isActive = true
    }
  })
  const debugInfo = {
    msg: 'Heading not found for url: ' + pageContext.url,
    urls: headings.map((h) => h.url),
    url: pageContext.url
  }
  assert(activeHeading || pageContext.pageExports.noHeading === true, debugInfo)
  return activeHeading
}

function addSubHeadings(headings: Heading[], pageContext: { pageExports: PageExports }, activeHeading: Heading | null) {
  if (activeHeading === null) return
  const activeHeadingIdx = headings.indexOf(activeHeading)
  assert(activeHeadingIdx >= 0)
  const pageHeadings = pageContext.pageExports.headings || []
  pageHeadings.forEach((pageHeading, i) => {
    const title = parseTitle(pageHeading.title)
    const url = '#' + pageHeading.id
    const heading: Heading = {
      url,
      title,
      level: 3
    }
    headings.splice(activeHeadingIdx + 1 + i, 0, heading)
  })
}