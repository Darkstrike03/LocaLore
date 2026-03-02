import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  image?: string | null
  url?: string
  type?: 'website' | 'article'
}

const BASE_TITLE = 'LocaLore — Global Folklore & Creature Atlas'
const BASE_DESC = 'A living bestiary of folklore creatures, yokai, spirits, and monsters from around the world.'
const BASE_IMAGE = 'https://localore.app/og-image.jpg'
const BASE_URL = 'https://localore.app'

function setMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setProp(property: string, content: string) {
  setMeta(`meta[property="${property}"]`, 'content', content)
  document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.setAttribute('property', property)
}

export function useSEO({ title, description, image, url, type = 'website' }: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} · LocaLore` : BASE_TITLE
    const desc = description ?? BASE_DESC
    const img = image ?? BASE_IMAGE
    const pageUrl = url ? `${BASE_URL}${url}` : BASE_URL

    document.title = fullTitle

    // OG
    setProp('og:title', fullTitle)
    setProp('og:description', desc)
    setProp('og:image', img)
    setProp('og:url', pageUrl)
    setProp('og:type', type)

    // Twitter
    setMeta('meta[name="twitter:title"]', 'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', desc)
    setMeta('meta[name="twitter:image"]', 'content', img)

    // Standard
    setMeta('meta[name="description"]', 'content', desc)

    // Canonical
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = pageUrl

    return () => {
      document.title = BASE_TITLE
    }
  }, [title, description, image, url, type])
}
