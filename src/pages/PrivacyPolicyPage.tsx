function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 animate-rise">
      <header className="mb-6">
        <h1 className="font-heading text-3xl text-gold">Privacy Policy</h1>
        <p className="mt-2 font-body text-sm text-parchment-muted">
          LocaLore is a small side project. This policy explains what information is collected and how it is used.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-heading text-sm text-gold">Information we collect</h2>
        <p className="font-body text-sm text-parchment-muted">We only collect the data you provide when signing in (via Supabase auth) and the content you submit (creature submissions, images, profile details). We store submitted images on ImgBB and image URLs in our database.</p>

        <h2 className="font-heading text-sm text-gold">How we use data</h2>
        <p className="font-body text-sm text-parchment-muted">Submitted content is used to build the public archive. Authentication data is managed by Supabase. We do not sell personal data.</p>

        <h2 className="font-heading text-sm text-gold">Third-party services</h2>
        <p className="font-body text-sm text-parchment-muted">The project uses Supabase for authentication and storage, and ImgBB for image hosting. These services have their own privacy terms — please review them if you want details.</p>

        <h2 className="font-heading text-sm text-gold">Retention</h2>
        <p className="font-body text-sm text-parchment-muted">Content remains unless removed by the author or moderators. If you need content removed, contact us via the Contact page.</p>

        <h2 className="font-heading text-sm text-gold">About the project</h2>
        <p className="font-body text-sm text-parchment-muted">LocaLore is a side project maintained by the developer behind OtakusLibrary — OtakusLibrary is the developer's established project; LocaLore is experimental and community-driven.</p>
      </section>
    </div>
  )
}

export default PrivacyPolicyPage
