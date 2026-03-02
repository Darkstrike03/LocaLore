// Type shim for @google/model-viewer custom element in JSX
// Uses React.JSX namespace required for "jsx": "react-jsx" (React 17+ automatic transform)
import type React from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        alt?: string
        ar?: boolean | ''
        'ar-modes'?: string
        'ar-scale'?: string
        'camera-controls'?: boolean | ''
        'auto-rotate'?: boolean | ''
        'auto-rotate-delay'?: number
        'shadow-intensity'?: number
        exposure?: number
        poster?: string
        loading?: 'auto' | 'lazy' | 'eager'
        reveal?: 'auto' | 'interaction' | 'manual'
        style?: React.CSSProperties
        class?: string
      }
    }
  }
}

export {}
