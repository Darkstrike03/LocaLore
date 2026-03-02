function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 animate-rise">
      <header className="mb-6">
        <h1 className="font-heading text-3xl text-gold">Terms of Service</h1>
        <p className="mt-2 font-body text-sm text-parchment-muted">These terms govern your use of LocaLore. By using the site you agree to the following:</p>
      </header>

      <section className="space-y-4">
        <h2 className="font-heading text-sm text-gold">Acceptable use</h2>
        <p className="font-body text-sm text-parchment-muted">You may use the archive to view and submit folklore content. Do not upload content that violates laws or infringes rights. Moderators may remove or edit submissions.</p>

        <h2 className="font-heading text-sm text-gold">Content ownership</h2>
        <p className="font-body text-sm text-parchment-muted">You retain ownership of content you submit, but you grant LocaLore a license to display and distribute it as part of the archive.</p>

        <h2 className="font-heading text-sm text-gold">Limitations</h2>
        <p className="font-body text-sm text-parchment-muted">The archive is provided as-is. The maintainers are not liable for any damages arising from use of the site.</p>

        <h2 className="font-heading text-sm text-gold">Project note</h2>
        <p className="font-body text-sm text-parchment-muted">LocaLore is a side project from the developer of OtakusLibrary. It is experimental; features and policies may change.</p>
      </section>
    </div>
  )
}

export default TermsPage
