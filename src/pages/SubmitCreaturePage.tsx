import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapContainer as RLMapContainer, Marker, TileLayer as RLTileLayer, useMapEvents } from 'react-leaflet'
import { Scroll, MapPin, ImagePlus, AlertTriangle, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/AuthProvider'
import type { CreatureType } from '../types/creature'

const WORLD_CENTER: [number, number] = [25, 20]

function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null
  onChange: (coords: { lat: number; lng: number }) => void
}) {
  useMapEvents({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    click(e: any) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return value ? <Marker position={[value.lat, value.lng]} /> : null
}

const typeOptions: { value: CreatureType; label: string }[] = [
  { value: 'spirit', label: 'Spirit' },
  { value: 'demon', label: 'Demon' },
  { value: 'trickster', label: 'Trickster' },
  { value: 'water_creature', label: 'Water creature' },
  { value: 'shapeshifter', label: 'Shapeshifter' },
  { value: 'undead', label: 'Undead' },
  { value: 'other', label: 'Other' },
]

const LABEL = 'mb-1.5 block font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted'
const TA = 'input-forge resize-none'

function SubmitCreaturePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [alternateNames, setAlternateNames] = useState('')
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('Japan')
  const [locality, setLocality] = useState('')
  const [creatureType, setCreatureType] = useState<CreatureType>('spirit')
  const [description, setDescription] = useState('')
  const [originStory, setOriginStory] = useState('')
  const [abilities, setAbilities] = useState('')
  const [survivalTips, setSurvivalTips] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const Map: any = RLMapContainer
  const DarkTile: any = RLTileLayer

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSubmitting(true)

    try {
      let imageUrl: string | null = null

      if (file) {
        const fileExt = file.name.split('.').pop()
        const path = `creatures/${crypto.randomUUID()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('creature-images')
          .upload(path, file)
        if (uploadError) throw uploadError
        const {
          data: { publicUrl },
        } = supabase.storage.from('creature-images').getPublicUrl(path)
        imageUrl = publicUrl
      }

      const { error: insertError } = await supabase.from('creatures').insert({
        name,
        alternate_names: alternateNames
          ? alternateNames.split(',').map((s) => s.trim())
          : [],
        region,
        country,
        locality,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        creature_type: creatureType,
        description,
        origin_story: originStory,
        abilities,
        survival_tips: survivalTips,
        image_url: imageUrl,
        verified: false,
        source: 'user_submitted',
        submitted_by: user.id,
      })

      if (insertError) throw insertError
      navigate('/library')
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit creature')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-heading text-xs uppercase tracking-[0.3em] text-parchment-muted animate-flicker">
          Checking your credentials with the archive...
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 animate-rise">
        <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-8 text-center shadow-void-deep">
          <Scroll className="mx-auto mb-4 h-8 w-8 text-gold/60" />
          <h1 className="font-heading text-xl text-gold">Only sworn witnesses may file.</h1>
          <p className="mt-2 font-body text-sm text-parchment-muted">
            You must be signed in to submit a new creature. This protects the integrity of the archive.
          </p>
          <Link to="/auth" className="btn-summon mt-5 inline-flex">
            <LogIn className="h-3.5 w-3.5" />
            Enter the archive
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 animate-rise">

      {/* Header */}
      <header className="mb-8">
        <p className="section-label mb-2 flex items-center gap-1.5">
          <Scroll className="h-3 w-3" />
          File a new sighting
        </p>
        <h1 className="font-heading text-3xl text-gold">Submit a Creature</h1>
        <p className="mt-2 font-body text-sm text-parchment-muted max-w-lg leading-relaxed">
          Add a local legend to the living atlas. Entries begin as{' '}
          <span className="text-crimson-DEFAULT/80">unverified</span> until cross-checked against primary sources.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]"
      >

        {/* ── LEFT: text fields ── */}
        <section className="space-y-4">

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="name">Name *</label>
              <input id="name" required value={name} onChange={(e) => setName(e.target.value)}
                className="input-forge" placeholder="e.g. Kappa" />
            </div>
            <div>
              <label className={LABEL} htmlFor="alternate">Alternate names</label>
              <input id="alternate" value={alternateNames} onChange={(e) => setAlternateNames(e.target.value)}
                className="input-forge" placeholder="Comma-separated" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL} htmlFor="region">Region *</label>
              <input id="region" required value={region} onChange={(e) => setRegion(e.target.value)}
                className="input-forge" placeholder="e.g. Kansai" />
            </div>
            <div>
              <label className={LABEL} htmlFor="country">Country *</label>
              <input id="country" required value={country} onChange={(e) => setCountry(e.target.value)}
                className="input-forge" />
            </div>
            <div>
              <label className={LABEL} htmlFor="locality">Locality</label>
              <input id="locality" value={locality} onChange={(e) => setLocality(e.target.value)}
                className="input-forge" placeholder="Town, landmark..." />
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="type">Creature type</label>
            <select id="type" value={creatureType}
              onChange={(e) => setCreatureType(e.target.value as CreatureType)}
              className="input-forge"
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="description">Description *</label>
            <textarea id="description" required rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)} className={TA}
              placeholder="What does it look like? Where is it found?" />
          </div>

          <div>
            <label className={LABEL} htmlFor="origin">Origin story</label>
            <textarea id="origin" rows={3} value={originStory}
              onChange={(e) => setOriginStory(e.target.value)} className={TA}
              placeholder="Where did it come from? Why does it haunt this place?" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="abilities">Abilities / powers</label>
              <textarea id="abilities" rows={3} value={abilities}
                onChange={(e) => setAbilities(e.target.value)} className={TA}
                placeholder="What makes it dangerous?" />
            </div>
            <div>
              <label className={LABEL} htmlFor="survival">How to survive</label>
              <textarea id="survival" rows={3} value={survivalTips}
                onChange={(e) => setSurvivalTips(e.target.value)} className={TA}
                placeholder="Wards, offerings, escape routes..." />
            </div>
          </div>
        </section>

        {/* ── RIGHT: map + image + submit ── */}
        <aside className="space-y-5 flex flex-col">

          {/* Location picker */}
          <div>
            <label className={`${LABEL} flex items-center gap-1.5`}>
              <MapPin className="h-3 w-3" />
              Pin location
            </label>
            <p className="mb-2 font-ui text-[11px] text-parchment-dim">
              Click the map to mark where this creature is most often encountered.
            </p>
            <div className="overflow-hidden rounded-xl border border-app-border">
              <Map center={WORLD_CENTER} zoom={2} className="h-52 w-full" zoomControl={false}>
                <DarkTile
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <LocationPicker value={location} onChange={setLocation} />
              </Map>
            </div>
            {location && (
              <p className="mt-1.5 font-ui text-[11px] text-parchment-muted">
                Pinned at{' '}
                <span className="font-mono text-gold/70">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              </p>
            )}
          </div>

          {/* Image upload */}
          <div>
            <label className={`${LABEL} flex items-center gap-1.5`} htmlFor="image">
              <ImagePlus className="h-3 w-3" />
              Image upload
            </label>
            <label
              htmlFor="image"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-app-border bg-app-surface px-4 py-6 text-center transition hover:border-gold/40"
            >
              <ImagePlus className="h-5 w-5 text-parchment-dim" />
              <span className="font-ui text-xs text-parchment-muted">
                {file ? file.name : 'Click to upload an image'}
              </span>
              <span className="font-ui text-[10px] text-parchment-dim">
                PNG, JPG, WEBP — artwork or symbolic depictions preferred
              </span>
              <input
                id="image"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-crimson/40 bg-crimson-dark/20 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-crimson-DEFAULT/80" />
              <p className="font-ui text-xs text-crimson-DEFAULT/90">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-summon w-full disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
          >
            <Scroll className="h-3.5 w-3.5" />
            {submitting ? 'Filing with the archive...' : 'Submit creature'}
          </button>
        </aside>
      </form>
    </div>
  )
}

export default SubmitCreaturePage

