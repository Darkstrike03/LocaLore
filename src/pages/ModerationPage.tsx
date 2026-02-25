import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Eye, MapPin, Skull, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Submission } from '../types/creature'

function ModerationPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setSubmissions(data as Submission[])
    }
    setLoading(false)
  }

  const handleApprove = async (submission: Submission) => {
    if (!user) return
    setProcessingId(submission.id)

    try {
      // 1. Insert into creatures table
      const { data: creatureData, error: creatureError } = await supabase
        .from('creatures')
        .insert({
          name: submission.name,
          alternate_names: submission.alternate_names,
          region: submission.region,
          country: submission.country,
          locality: submission.locality,
          latitude: submission.latitude,
          longitude: submission.longitude,
          creature_type: submission.creature_type,
          description: submission.description,
          origin_story: submission.origin_story,
          abilities: submission.abilities,
          survival_tips: submission.survival_tips,
          image_url: submission.image_url,
          verified: true,
          source: 'user_submitted',
          submitted_by: submission.submitted_by,
        })
        .select()
        .single()

      if (creatureError) throw creatureError

      // 2. Update submission status
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          creature_id: creatureData.id,
        })
        .eq('id', submission.id)

      if (updateError) throw updateError

      // Remove from list
      setSubmissions(prev => prev.filter(s => s.id !== submission.id))
    } catch (err) {
      console.error('Approval error:', err)
      alert('Failed to approve submission')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (submission: Submission, note?: string) => {
    if (!user) return
    setProcessingId(submission.id)

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          review_note: note || null,
        })
        .eq('id', submission.id)

      if (error) throw error

      setSubmissions(prev => prev.filter(s => s.id !== submission.id))
    } catch (err) {
      console.error('Rejection error:', err)
      alert('Failed to reject submission')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="font-heading text-sm uppercase tracking-[0.3em] text-parchment-muted">
            Loading submissions...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl text-gold tracking-wide">
            Moderation Queue
          </h1>
          <p className="mt-2 font-body text-sm text-parchment-muted">
            Review and approve pending creature submissions
          </p>
        </div>

        {/* Submissions */}
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-app-border bg-app-surface p-12 text-center">
            <Eye className="h-12 w-12 text-gold/40" />
            <div>
              <p className="font-heading text-lg text-gold/80">
                All clear.
              </p>
              <p className="mt-1 font-body text-sm text-parchment-muted">
                No pending submissions to review.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-2xl border border-app-border bg-app-surface p-6 transition-all hover:border-gold/30"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                  {/* Image */}
                  {submission.image_url && (
                    <div className="shrink-0 lg:w-48">
                      <img
                        src={submission.image_url}
                        alt={submission.name}
                        className="h-40 w-full rounded-lg border border-app-border object-cover lg:h-32"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    {/* Title & Meta */}
                    <div>
                      <h3 className="font-heading text-xl text-gold">
                        {submission.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-parchment-muted">
                        {submission.region && submission.country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {submission.region}, {submission.country}
                          </span>
                        )}
                        <span className="badge-rune">
                          <Skull className="h-2.5 w-2.5" />
                          {submission.creature_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="line-clamp-3 font-body text-sm leading-relaxed text-parchment/80">
                      {submission.description}
                    </p>

                    {/* Meta info */}
                    <p className="font-ui text-xs text-parchment-dim">
                      Submitted {new Date(submission.created_at).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleApprove(submission)}
                        disabled={processingId === submission.id}
                        className="flex items-center gap-1.5 rounded-lg border border-green-600/40 bg-green-950/30 px-4 py-2 font-ui text-xs font-medium uppercase tracking-wider text-green-400 transition-all hover:border-green-500/60 hover:bg-green-950/50 disabled:opacity-50"
                      >
                        {processingId === submission.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt('Rejection reason (optional):')
                          if (note !== null) handleReject(submission, note)
                        }}
                        disabled={processingId === submission.id}
                        className="flex items-center gap-1.5 rounded-lg border border-crimson/40 bg-crimson-dark/30 px-4 py-2 font-ui text-xs font-medium uppercase tracking-wider text-crimson-DEFAULT transition-all hover:border-crimson/60 hover:bg-crimson-dark/50 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ModerationPage
