import { useEffect, useState } from 'react'
import { MapPin, X, LocateFixed, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { SightingReport } from '../types/creature'

interface Props {
  creatureId: string
  creatureName: string
}

export default function SightingReportModal({ creatureId, creatureName }: Props) {
  const { user, openAuthModal } = useAuth()
  const [open, setOpen] = useState(false)
  const [reports, setReports] = useState<SightingReport[]>([])
  const [loading, setLoading] = useState(true)

  // form state
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('sighting_reports')
        .select('*')
        .eq('creature_id', creatureId)
        .order('created_at', { ascending: false })
      if (mounted) { setReports((data as SightingReport[]) || []); setLoading(false) }
    })()
    return () => { mounted = false }
  }, [creatureId])

  function useMyLocation() {
    if (!navigator.geolocation) { setError('Geolocation not supported on your device.'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(5))
        setLng(pos.coords.longitude.toFixed(5))
        setGeoLoading(false)
      },
      () => { setError('Could not get location — enter coordinates manually.'); setGeoLoading(false) },
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { openAuthModal(); return }
    setError('')
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)
    if (isNaN(latitude) || isNaN(longitude)) { setError('Enter valid coordinates.'); return }
    if (description.trim().length < 5) { setError('Description too short (min 5 characters).'); return }

    setSubmitting(true)
    // grab display_name
    const { data: me } = await supabase.from('users').select('display_name').eq('id', user.id).maybeSingle()
    const { data: inserted, error: err } = await supabase
      .from('sighting_reports')
      .insert({
        creature_id: creatureId,
        user_id: user.id,
        display_name: me?.display_name ?? null,
        latitude,
        longitude,
        description: description.trim(),
      })
      .select()
      .maybeSingle()

    setSubmitting(false)
    if (err) { setError(err.message); return }
    if (inserted) setReports(prev => [inserted as SightingReport, ...prev])
    // award XP
    await supabase.from('xp_events').insert({ user_id: user.id, event_type: 'sighting_filed', xp_amount: 5, reference_id: creatureId }).then(() => {})
    // Increment XP directly on users table
    const { data: xpRow } = await supabase.from('users').select('xp').eq('id', user.id).maybeSingle()
    const currentXp = (xpRow as any)?.xp ?? 0
    await supabase.from('users').update({ xp: currentXp + 5 }).eq('id', user.id)
    setDescription(''); setLat(''); setLng('')
  }

  async function remove(id: string) {
    await supabase.from('sighting_reports').delete().eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  return (
    <>
      {/* Trigger chip */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-app-border px-3 py-1.5 font-ui text-[11px] text-parchment-muted hover:border-gold/30 hover:text-parchment transition-all"
      >
        <MapPin className="h-3.5 w-3.5 text-crimson/70" />
        {loading ? '…' : `${reports.length}`} sighting{reports.length !== 1 ? 's' : ''}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-void/85 backdrop-blur-sm pt-14 px-4 pb-10">
          <div className="w-full max-w-lg rounded-2xl border border-app-border bg-void shadow-void-deep animate-rise">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
              <div>
                <h3 className="font-heading text-lg text-gold">Sighting Reports</h3>
                <p className="font-ui text-[10px] uppercase tracking-[0.25em] text-parchment-muted">{creatureName}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border text-parchment-muted hover:text-crimson transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Submit form */}
            <form onSubmit={submit} className="border-b border-app-border p-5 space-y-3">
              <h4 className="font-ui text-[10px] uppercase tracking-[0.25em] text-parchment-muted">File a new sighting</h4>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Describe what you witnessed, when and how..."
                className="input-forge resize-none text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  className="input-forge text-sm flex-1 font-mono"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  className="input-forge text-sm flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={geoLoading}
                  title="Use my location"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-app-border text-parchment-muted hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50"
                >
                  <LocateFixed className={`h-4 w-4 ${geoLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {error && <p className="font-ui text-[11px] text-crimson">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !user}
                  onClick={!user ? openAuthModal : undefined}
                  className="btn-summon disabled:opacity-50"
                >
                  {submitting ? 'Filing…' : user ? 'File sighting' : 'Sign in to file'}
                </button>
              </div>
            </form>

            {/* Reports list */}
            <div className="max-h-80 overflow-y-auto p-5 space-y-3">
              {loading ? (
                <p className="text-parchment-dim text-sm animate-pulse">Loading reports…</p>
              ) : reports.length === 0 ? (
                <p className="font-body text-sm italic text-parchment-dim text-center py-4">No sightings on record.</p>
              ) : (
                reports.map(r => (
                  <div key={r.id} className="relative rounded-xl border border-app-border bg-app-surface px-4 py-3 group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MapPin className="h-3 w-3 text-crimson/70 flex-shrink-0" />
                      <span className="font-mono text-[10px] text-parchment-dim">
                        {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                      </span>
                      <span className="font-ui text-[10px] text-parchment-dim ml-auto">
                        {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                    </div>
                    <p className="font-body text-[13px] text-parchment/80 leading-relaxed pl-5">{r.description}</p>
                    <p className="mt-1 font-ui text-[10px] text-parchment-dim pl-5">— {r.display_name ?? 'Anonymous'}</p>
                    {user?.id === r.user_id && (
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-parchment-dim hover:text-crimson transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
