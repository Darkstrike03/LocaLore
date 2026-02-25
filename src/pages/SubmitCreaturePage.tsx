import type { FormEvent } from 'react'
import { useState } from 'react'
import { MapContainer as RLMapContainer, Marker, TileLayer as RLTileLayer, useMapEvents } from 'react-leaflet'
import {
  Scroll, MapPin, ImagePlus, AlertTriangle, CheckCircle2,
  Skull, Sparkles, Ghost, Waves, Layers, HelpCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { uploadImage } from '../lib/imgbb'
import { useAuth } from '../context/AuthContext'
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
    click(e: any) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return value ? <Marker position={[value.lat, value.lng]} /> : null
}

const TYPE_OPTIONS: { value: CreatureType; label: string; Icon: React.ElementType }[] = [
  { value: 'spirit',         label: 'Spirit',       Icon: Sparkles },
  { value: 'demon',          label: 'Demon',        Icon: Skull },
  { value: 'trickster',      label: 'Trickster',    Icon: HelpCircle },
  { value: 'water_creature', label: 'Water',        Icon: Waves },
  { value: 'shapeshifter',   label: 'Shapeshifter', Icon: Layers },
  { value: 'undead',         label: 'Undead',       Icon: Ghost },
  { value: 'other',          label: 'Other',        Icon: HelpCircle },
]

const LABEL = 'mb-1.5 block font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted'
const TA    = 'input-forge resize-none'

function SubmitCreaturePage() {
  const { user, loading, openAuthModal } = useAuth()

  const [name, setName]                     = useState('')
  const [alternateNames, setAlternateNames] = useState('')
  const [region, setRegion]                 = useState('')
  const [country, setCountry]               = useState('')
  const [locality, setLocality]             = useState('')
  const [creatureType, setCreatureType]     = useState<CreatureType>('spirit')
  const [description, setDescription]       = useState('')
  const [originStory, setOriginStory]       = useState('')
  const [abilities, setAbilities]           = useState('')
  const [survivalTips, setSurvivalTips]     = useState('')
  const [location, setLocation]             = useState<{ lat: number; lng: number } | null>(null)

  const [file, setFile]                 = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)

  const [error, setError]       = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(false)

  const Map: any = RLMapContainer
  const DarkTile: any = RLTileLayer

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    setFile(picked)
    setImagePreview(picked ? URL.createObjectURL(picked) : null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) { openAuthModal(); return }

    if (!name.trim())        { setError('Name is required.'); return }
    if (!description.trim()) { setError('Description is required.'); return }
    if (!creatureType)       { setError('Creature type is required.'); return }
    if (!locality.trim() && !location) {
      setError('Please enter a locality or pin a location on the map.')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      let imageUrl: string | null = null
      if (file) {
        setUploading(true)
        imageUrl = await uploadImage(file)
        setUploading(false)
      }

      const { error: insertError } = await supabase.from('submissions').insert({
        submitted_by:   user.id,
        name:           name.trim(),
        alternate_names: alternateNames
          ? alternateNames.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        region:        region.trim()       || null,
        country:       country.trim()      || null,
        locality:      locality.trim()     || null,
        latitude:      location?.lat       ?? null,
        longitude:     location?.lng       ?? null,
        creature_type: creatureType,
        description:   description.trim(),
        origin_story:  originStory.trim()  || null,
        abilities:     abilities.trim()    || null,
        survival_tips: survivalTips.trim() || null,
        image_url:     imageUrl,
      })

      if (insertError) throw insertError

      setSuccess(true)
      setName(''); setAlternateNames(''); setRegion(''); setCountry('')
      setLocality(''); setDescription(''); setOriginStory('')
      setAbilities(''); setSurvivalTips('')
      setCreatureType('spirit'); setLocation(null)
      setFile(null); setImagePreview(null)
    } catch (err: unknown) {
      setUploading(false)
      setError(err instanceof Error ? err.message : 'Failed to submit creature — please try again.')
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
          <p className="mt-2 font-body text-sm text-parchment-muted leading-relaxed">
            You must be signed in to submit a new creature. This protects the integrity of the archive.
          </p>
          <button
            type="button"
            onClick={openAuthModal}
            className="btn-summon mt-5 inline-flex"
          >
            <Scroll className="h-3.5 w-3.5" />
            Enter the archive
          </button>
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
          <span className="text-crimson/80">unverified</span> until cross-checked against primary sources.
        </p>
      </header>

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div>
            <p className="font-heading text-sm text-gold">Your creature has been documented.</p>
            <p className="mt-0.5 font-ui text-xs text-parchment-muted">
              It will remain unverified until cross-referenced by an archivist. Thank you for contributing to the record.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setSuccess(false)}
            className="ml-auto text-parchment-dim hover:text-gold shrink-0"
          >
            •
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]"
      >

        {/* '”€'”€ LEFT: text fields '”€'”€ */}
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
              <label className={LABEL} htmlFor="region">Region</label>
              <input id="region" value={region} onChange={(e) => setRegion(e.target.value)}
                className="input-forge" placeholder="e.g. Kansai" />
            </div>
            <div>
              <label className={LABEL} htmlFor="country">Country</label>
              <input id="country" value={country} onChange={(e) => setCountry(e.target.value)}
                className="input-forge" placeholder="e.g. Japan" />
            </div>
            <div>
              <label className={LABEL} htmlFor="locality">Locality</label>
              <input id="locality" value={locality} onChange={(e) => setLocality(e.target.value)}
                className="input-forge" placeholder="Town, landmark..." />
            </div>
          </div>

          {/* Creature type '€” pill buttons */}
          <div>
            <p className={LABEL}>Creature type *</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {TYPE_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCreatureType(value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-ui text-[11px] uppercase tracking-[0.15em] transition-all duration-150 ${
                    creatureType === value
                      ? 'border-gold/50 bg-gold/10 text-gold'
                      : 'border-app-border text-parchment-muted hover:border-gold/30 hover:text-parchment'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
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

        {/* '”€'”€ RIGHT: map + image + submit '”€'”€ */}
        <aside className="flex flex-col space-y-5">

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
            <label className={`${LABEL} flex items-center gap-1.5`}>
              <ImagePlus className="h-3 w-3" />
              Image upload
            </label>

            {imagePreview ? (
              <div className="relative mb-2 overflow-hidden rounded-xl border border-gold/30">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-40 w-full object-cover opacity-80"
                />
                <button
                  type="button"
                  onClick={() => { setFile(null); setImagePreview(null) }}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-void/80 text-parchment-muted hover:text-gold text-xs"
                  aria-label="Remove image"
                >
                  •
                </button>
              </div>
            ) : (
              <label
                htmlFor="image"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-app-border bg-app-surface px-4 py-6 text-center transition hover:border-gold/40"
              >
                <ImagePlus className="h-5 w-5 text-parchment-dim" />
                <span className="font-ui text-xs text-parchment-muted">Click to upload an image</span>
                <span className="font-ui text-[10px] text-parchment-dim">
                  PNG, JPG, WEBP '€” artwork or symbolic depictions preferred
                </span>
              </label>
            )}

            <input
              id="image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />

            {uploading && (
              <p className="mt-1.5 font-ui text-[11px] text-parchment-muted animate-flicker">
                Uploading image to the void...
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-crimson/40 bg-crimson/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-crimson/80" />
              <p className="font-ui text-xs text-crimson/90">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || uploading}
            className="btn-summon w-full disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
          >
            <Scroll className="h-3.5 w-3.5" />
            {uploading ? 'Uploading...' : submitting ? 'Filing with the archive...' : 'Submit creature'}
          </button>
        </aside>
      </form>
    </div>
  )
}

export default SubmitCreaturePage

