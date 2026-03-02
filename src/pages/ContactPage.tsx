import { useState } from 'react'

function ContactPage() {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // lightweight client-side behavior: open mailto with the message
    const subject = encodeURIComponent('LocaLore contact')
    const body = encodeURIComponent(message)
    window.location.href = `mailto:hello@example.com?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 animate-rise">
      <header className="mb-6">
        <h1 className="font-heading text-3xl text-gold">Contact</h1>
        <p className="mt-2 font-body text-sm text-parchment-muted">Questions, reports, or removal requests? Send a message.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted">Message</label>
        <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="input-forge w-full" />
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-summon">Send message</button>
          {sent && <span className="font-ui text-sm text-parchment-muted">Opening your email client…</span>}
        </div>
      </form>

      <div className="rune-divider mt-8 mb-4">
        <span />
      </div>

      <p className="font-body text-sm text-parchment-muted">Alternatively, email: <a href="mailto:otakuslibrary75@gmail.com" className="text-gold">otakuslibrary75@gmail.com</a></p>

      <div className="mt-6 font-body text-sm text-parchment-dim">
        <p>Note: LocaLore is a side project by the developer of OtakusLibrary — please expect minimal response times.</p>
      </div>
    </div>
  )
}

export default ContactPage
