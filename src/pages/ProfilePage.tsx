import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { uploadImage } from '../lib/imgbb'
import { Eye, Save } from 'lucide-react'
import XPBadge from '../components/XPBadge'

function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [userCreatures, setUserCreatures] = useState<any[]>([])
  const [userSubmissions, setUserSubmissions] = useState<any[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [isModerator, setIsModerator] = useState(false)
  const [aiEntries, setAiEntries] = useState<any[]>([])

  // form fields
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!user) { return }
    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      if (!error && data) {
        setProfile(data)
        setUsername(data.username ?? '')
        setDisplayName(data.display_name ?? '')
        setAvatarUrl(data.avatar_url ?? null)
        setBio(data.bio ?? '')
      }
      // finished loading
    }
    void load()
  }, [user])

  useEffect(() => {
    if (!user) return
    let mounted = true
    ;(async () => {
      setEntriesLoading(true)
      // detect moderator role
      const { data: me } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
      if (mounted && me) setIsModerator(me.role?.toLowerCase() === 'moderator')

      // fetch published creatures by this user
      const { data: cdata } = await supabase
        .from('creatures')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })

      // fetch AI-collected pending entries for moderators
      const { data: aidata } = await supabase
        .from('creatures')
        .select('*')
        .eq('source', 'ai_collected')
        .eq('verified', false)
        .order('created_at', { ascending: false })

      // fetch submissions by this user
      const { data: sdata } = await supabase
        .from('submissions')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })

      if (!mounted) return
      setUserCreatures((cdata as any[]) || [])
      setUserSubmissions((sdata as any[]) || [])
      setAiEntries((aidata as any[]) || [])
      setEntriesLoading(false)
    })()
    return () => { mounted = false }
  }, [user])

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-parchment-muted">Sign in to view your profile.</p>
      </div>
    )
  }

  const needsCompletion = !profile || !profile.username

  async function handleAvatarFile(f?: File) {
    if (!f) return
    setUploading(true)
    try {
      const url = await uploadImage(f)
      setAvatarUrl(url)
    } catch (err) {
      console.error(err)
      alert('Avatar upload failed')
    } finally {
      setUploading(false)
    }
  }

  function resetForm() {
    setUsername(profile?.username ?? '')
    setDisplayName(profile?.display_name ?? '')
    setAvatarUrl(profile?.avatar_url ?? null)
    setBio(profile?.bio ?? '')
  }

  async function handleSubmit(e?: any) {
    if (e && e.preventDefault) e.preventDefault()
    if (!user) return
    // username mandatory on first submit
    if (!username || !displayName) {
      alert('Please enter a username and display name')
      return
    }

    const payload: any = {
      username: username.trim(),
      display_name: displayName.trim(),
      avatar_url: avatarUrl,
      bio: bio.trim() || null,
    }

    try {
      // uniqueness checks
      const uname = payload.username
      const dname = payload.display_name
      if (uname) {
        const { data: existingU, error: ue } = await supabase
          .from('users')
          .select('id')
          .eq('username', uname)
          .maybeSingle()
        if (ue) throw ue
        if (existingU && existingU.id !== user.id) {
          alert('Username already taken')
          return
        }
      }
      if (dname) {
        const { data: existingD, error: de } = await supabase
          .from('users')
          .select('id')
          .eq('display_name', dname)
          .maybeSingle()
        if (de) throw de
        if (existingD && existingD.id !== user.id) {
          alert('Display name already taken')
          return
        }
      }

      // upsert profile row
      const { error } = await supabase
        .from('users')
        .upsert({ id: user.id, ...payload }, { onConflict: 'id' })
      if (error) throw error
      setProfile((p:any) => ({ ...(p||{}), ...payload }))
      setEditMode(false)
      alert('Profile saved')
    } catch (err) {
      console.error(err)
      alert('Failed to save profile')
    }
  }

  async function verifyCreature(creatureId: string) {
    try {
      const { error } = await supabase.from('creatures').update({ verified: true }).eq('id', creatureId)
      if (error) throw error
      setUserCreatures((prev) => prev.map((c) => c.id === creatureId ? { ...c, verified: true } : c))
      setAiEntries((prev) => prev.filter((a) => a.id !== creatureId))
      alert('Creature verified')
    } catch (err) {
      console.error(err)
      alert('Failed to verify creature')
    }
  }

  async function rejectAiEntry(creatureId: string) {
    try {
      const { error } = await supabase.from('creatures').delete().eq('id', creatureId)
      if (error) throw error
      setAiEntries((prev) => prev.filter((a) => a.id !== creatureId))
      alert('AI entry removed')
    } catch (err) {
      console.error(err)
      alert('Failed to remove AI entry')
    }
  }

  async function approveSubmission(sub: any) {
    try {
      // insert into creatures table
      const insertPayload = {
        slug: sub.slug ?? sub.name.toLowerCase().replace(/\s+/g, '-'),
        name: sub.name,
        alternate_names: sub.alternate_names || [],
        region: sub.region || null,
        country: sub.country || null,
        locality: sub.locality || null,
        latitude: sub.latitude || null,
        longitude: sub.longitude || null,
        creature_type: sub.creature_type || 'other',
        description: sub.description || null,
        origin_story: sub.origin_story || null,
        abilities: sub.abilities || null,
        survival_tips: sub.survival_tips || null,
        image_url: sub.image_url || null,
        source: 'user_submitted',
        submitted_by: sub.submitted_by,
        verified: true,
      }
      const { data: created, error: insErr } = await supabase.from('creatures').insert(insertPayload).select().maybeSingle()
      if (insErr) throw insErr

      // mark submission approved
      const { error: upErr } = await supabase.from('submissions').update({ status: 'approved', creature_id: (created as any).id }).eq('id', sub.id)
      if (upErr) throw upErr

      // update local lists
      setUserSubmissions((prev) => prev.filter((s) => s.id !== sub.id))
      setUserCreatures((prev) => [(created as any), ...prev])
      alert('Submission approved and published')
    } catch (err) {
      console.error(err)
      alert('Failed to approve submission')
    }
  }

  return (
    <div className="min-h-screen bg-app-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-2xl text-gold mb-2">Your profile</h1>
        <p className="font-ui text-sm text-parchment-muted mb-6">Manage your public profile.</p>

        <div className="rounded-2xl border border-app-border bg-app-surface p-6">
          {!editMode ? (
            <div className="flex flex-col md:flex-row md:items-center md:gap-6">
              <div className="h-24 w-24 rounded-lg overflow-hidden bg-void/20 flex items-center justify-center border border-app-border">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name || profile.username} className="h-full w-full object-cover" />
                ) : (
                  <Eye className="h-10 w-10 text-parchment-dim" />
                )}
              </div>
              <div className="flex-1 mt-4 md:mt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-xl text-gold">{profile?.display_name || profile?.username}</h2>
                    <p className="text-parchment-muted">@{profile?.username}</p>
                  </div>
                  <div>
                    <button onClick={() => setEditMode(true)} className="btn-summon">Edit profile</button>
                  </div>
                </div>
                <p className="mt-4 text-parchment-dim">{profile?.bio}</p>
                <div className="mt-5">
                  <XPBadge xp={profile?.xp ?? 0} />
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg overflow-hidden bg-void/20 flex items-center justify-center border border-app-border">
                  {avatarUrl ? (
                    // eslint-disable-next-line jsx-a11y/img-redundant-alt
                    <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <Eye className="h-8 w-8 text-parchment-dim" />
                  )}
                </div>
                <div>
                  <label className="font-ui text-xs text-parchment-muted">Avatar</label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(ev) => handleAvatarFile(ev.target.files?.[0])}
                    />
                    {uploading && <span className="text-xs text-parchment-muted">Uploading…</span>}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-ui text-xs text-parchment-muted">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="unique-handle"
                  className="input-forge mt-1 w-full"
                  disabled={!!profile?.username}
                />
                {profile?.username && <p className="mt-1 text-xs text-parchment-dim">Username is locked once set.</p>}
              </div>

              <div>
                <label className="font-ui text-xs text-parchment-muted">Display name</label>
                <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="input-forge mt-1 w-full" />
              </div>

              <div>
                <label className="font-ui text-xs text-parchment-muted">Bio</label>
                <textarea value={bio} onChange={(e)=>setBio(e.target.value)} className="input-forge mt-1 w-full h-28" />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => { resetForm(); setEditMode(false) }} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-summon flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save profile
                </button>
              </div>
            </form>
          )}
        </div>
        {/* User entries */}
        <div className="mt-8 space-y-6">
          <h3 className="font-heading text-lg text-gold">Your entries</h3>

          {entriesLoading ? (
            <p className="text-parchment-muted">Loading your entries…</p>
          ) : (
            <div className="grid gap-4">
              {/* Published creatures */}
              <div>
                <h4 className="font-ui text-sm text-parchment-muted uppercase tracking-[0.18em] mb-3">Published</h4>
                {userCreatures.length === 0 ? (
                  <p className="text-parchment-dim">You have no published entries yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {userCreatures.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface p-3 hover:border-gold/30 transition-colors">
                        <Link to={`/creatures/${c.slug}`} className="flex flex-1 min-w-0 items-center gap-3 group">
                          <div className="h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-void/20 border border-app-border">
                            {c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-cover group-hover:opacity-90 transition-opacity" /> : <Eye className="h-6 w-6 text-parchment-dim m-2" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-heading text-sm text-gold group-hover:text-gold/80 transition-colors truncate">{c.name}</div>
                            <div className="text-[12px] text-parchment-muted truncate">{c.region || ''} {c.country ? `· ${c.country}` : ''}</div>
                          </div>
                        </Link>
                        <div className="flex flex-shrink-0 items-center gap-3 ml-3">
                          {!c.verified ? <span className="font-ui text-xs text-crimson/80">Unverified</span> : <span className="font-ui text-xs text-gold/80">Verified</span>}
                          {isModerator && !c.verified && (
                            <button type="button" onClick={() => verifyCreature(c.id)} className="btn-ghost">Verify</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submissions */}
              <div>
                <h4 className="font-ui text-sm text-parchment-muted uppercase tracking-[0.18em] mb-3">Submissions (pending)</h4>
                {userSubmissions.length === 0 ? (
                  <p className="text-parchment-dim">You have no pending submissions.</p>
                ) : (
                  <div className="grid gap-3">
                    {userSubmissions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-md overflow-hidden bg-void/20 border border-app-border">
                            {s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" /> : <Eye className="h-6 w-6 text-parchment-dim m-2" />}
                          </div>
                          <div>
                            <div className="font-heading text-sm text-gold">{s.name}</div>
                            <div className="text-[12px] text-parchment-muted">{s.region || ''} {s.country ? `· ${s.country}` : ''}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-ui text-xs text-parchment-muted">{s.status || 'pending'}</span>
                          {isModerator && (
                            <button type="button" onClick={() => approveSubmission(s)} className="btn-ghost">Approve</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* AI-collected entries (moderator review) */}
              {isModerator && (
                <div>
                  <h4 className="font-ui text-sm text-parchment-muted uppercase tracking-[0.18em] mb-3">AI-collected (review)</h4>
                  {aiEntries.length === 0 ? (
                    <p className="text-parchment-dim">No AI-collected entries awaiting review.</p>
                  ) : (
                    <div className="grid gap-3">
                      {aiEntries.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface p-3 hover:border-gold/30 transition-colors">
                          <Link to={`/creatures/${a.slug}`} className="flex flex-1 min-w-0 items-center gap-3 group">
                            <div className="h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-void/20 border border-app-border">
                              {a.image_url ? <img src={a.image_url} alt={a.name} className="h-full w-full object-cover group-hover:opacity-90 transition-opacity" /> : <Eye className="h-6 w-6 text-parchment-dim m-2" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-heading text-sm text-gold group-hover:text-gold/80 transition-colors truncate">{a.name}</div>
                              <div className="text-[12px] text-parchment-muted truncate">{a.region || ''} {a.country ? `· ${a.country}` : ''}</div>
                            </div>
                          </Link>
                          <div className="flex flex-shrink-0 items-center gap-3 ml-3">
                            <span className="font-ui text-xs text-parchment-muted">AI-collected</span>
                            <button type="button" onClick={() => verifyCreature(a.id)} className="btn-ghost">Approve</button>
                            <button type="button" onClick={() => rejectAiEntry(a.id)} className="btn-ghost">Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* If profile missing, open modal-like blocking UI */}
      {needsCompletion && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-void/90 p-4">
          <div className="max-w-xl w-full rounded-xl bg-app-surface p-6 border border-app-border">
            <h2 className="font-heading text-lg text-gold">Complete your profile</h2>
            <p className="text-parchment-muted text-sm mt-1 mb-4">Please choose a username and display name to continue.</p>
            <form onSubmit={(e)=>{ e.preventDefault(); handleSubmit() }} className="space-y-4">
              <div>
                <label className="font-ui text-xs text-parchment-muted">Username</label>
                <input value={username} onChange={(e)=>setUsername(e.target.value)} className="input-forge mt-1 w-full" />
              </div>
              <div>
                <label className="font-ui text-xs text-parchment-muted">Display name</label>
                <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="input-forge mt-1 w-full" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-summon">Continue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
