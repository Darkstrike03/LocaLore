import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/AuthProvider'
import type { CreatureType } from '../types/creature'

const JAPAN_CENTER: [number, number] = [36.2, 138.2]

function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null
  onChange: (coords: { lat: number; lng: number }) => void
}) {
  useMapEvents({
    click(e) {
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
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-300">
        Checking your credentials with the archive...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-8 text-sm text-slate-200">
        <h1 className="font-gothic text-2xl font-semibold text-amber-400">
          Only sworn witnesses may file.
        </h1>
        <p className="mt-2 text-xs text-slate-400">
          You need to be signed in to submit a new creature. This helps us trace and
          protect the archive.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-500/20"
          onClick={() => navigate('/auth')}
        >
          Go to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-100">
      <h1 className="font-gothic text-2xl font-semibold text-amber-400">
        Submit a creature
      </h1>
      <p className="mt-1 text-xs text-slate-400">
        Add a local legend to the living atlas. Entries begin as{' '}
        <span className="text-amber-300">unverified</span> until cross-checked.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block" htmlFor="alternate">
                Alternate names
              </label>
              <input
                id="alternate"
                placeholder="Comma-separated"
                value={alternateNames}
                onChange={(e) => setAlternateNames(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block" htmlFor="region">
                Region
              </label>
              <input
                id="region"
                required
                placeholder="e.g. Kansai"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block" htmlFor="country">
                Country
              </label>
              <input
                id="country"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block" htmlFor="locality">
                Specific locality
              </label>
              <input
                id="locality"
                placeholder="e.g. Howrah, West Bengal"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block" htmlFor="type">
              Creature type
            </label>
            <select
              id="type"
              value={creatureType}
              onChange={(e) => setCreatureType(e.target.value as CreatureType)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block" htmlFor="origin">
              Origin story
            </label>
            <textarea
              id="origin"
              rows={3}
              value={originStory}
              onChange={(e) => setOriginStory(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block" htmlFor="abilities">
              Abilities / powers
            </label>
            <textarea
              id="abilities"
              rows={2}
              value={abilities}
              onChange={(e) => setAbilities(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block" htmlFor="survival">
              How to survive an encounter
            </label>
            <textarea
              id="survival"
              rows={2}
              value={survivalTips}
              onChange={(e) => setSurvivalTips(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </section>

        <aside className="space-y-3">
          <div>
            <label className="mb-1 block">Location picker</label>
            <p className="mb-2 text-[11px] text-slate-400">
              Click on the map to drop a pin near where this creature is most often
              encountered.
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <MapContainer
                center={JAPAN_CENTER}
                zoom={4}
                className="h-52 w-full"
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <LocationPicker value={location} onChange={setLocation} />
              </MapContainer>
            </div>
            {location && (
              <p className="mt-1 text-[11px] text-slate-400">
                Pinned at{' '}
                <span className="font-mono">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block" htmlFor="image">
              Image upload
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Avoid faces of real people. Artwork, sketches, or symbolic photos are ideal.
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
          >
            {submitting ? 'Submitting to the archive...' : 'Submit creature'}
          </button>
        </aside>
      </form>
    </div>
  )
}

export default SubmitCreaturePage

