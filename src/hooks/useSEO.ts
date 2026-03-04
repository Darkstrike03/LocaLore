import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  image?: string | null
  url?: string
  type?: 'website' | 'article'
  /**
   * One or more JSON-LD objects to inject into the page head.
   * Pass an array for multiple @type blocks (e.g. Article + BreadcrumbList).
   * AEO — add FAQPage; GEO/LLMO — add structured entities.
   */
  structuredData?: Record<string, unknown> | Record<string, unknown>[]
}

const BASE_TITLE = 'LocaLore — Global Folklore & Creature Atlas'
const BASE_DESC = 'A living bestiary of folklore creatures, yokai, spirits, and monsters from around the world.'
const BASE_IMAGE = 'https://localore.vercel.app/og-image.jpg'
const BASE_URL = 'https://localore.vercel.app'
const LD_ID = 'ld-json-page'

function setMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setProp(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function useSEO({ title, description, image, url, type = 'website', structuredData }: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} · LocaLore` : BASE_TITLE
    // Clamp description to 155 chars for optimal snippet length
    const rawDesc = description ?? BASE_DESC
    const desc = rawDesc.length > 155 ? rawDesc.slice(0, 152) + '…' : rawDesc
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

    // Structured data — supports single object or array of objects
    let ldScript = document.getElementById(LD_ID) as HTMLScriptElement | null
    if (structuredData) {
      if (!ldScript) {
        ldScript = document.createElement('script')
        ldScript.id = LD_ID
        ldScript.type = 'application/ld+json'
        document.head.appendChild(ldScript)
      }
      ldScript.textContent = JSON.stringify(
        Array.isArray(structuredData) ? structuredData : structuredData
      )
    } else if (ldScript) {
      ldScript.remove()
    }

    return () => {
      document.title = BASE_TITLE
      // Restore base meta on unmount so stale data doesn't leak
      setProp('og:title', BASE_TITLE)
      setProp('og:description', BASE_DESC)
      setProp('og:image', BASE_IMAGE)
      setProp('og:url', BASE_URL)
      setProp('og:type', 'website')
      setMeta('meta[name="description"]', 'content', BASE_DESC)
      const ldEl = document.getElementById(LD_ID)
      if (ldEl) ldEl.remove()
    }
  }, [title, description, image, url, type, structuredData])
}
