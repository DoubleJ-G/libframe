import { assert } from './assert'

export { determineSectionUrlHash }
export { determineSectionTitle }

function determineSectionUrlHash(title: string): string {
  const urlHash = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-')
  return urlHash
}

function determineSectionTitle(urlWithHash: string): string {
  assert(urlWithHash.includes('#'), { urlWithHash })
  const urlHash = urlWithHash.split('#')[1]
  const title = urlHash
    .split('-')
    .map((word) => (word.length <= 3 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ')
  return title
}
