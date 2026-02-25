import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { uploadImage } from '../lib/imgbb'
import { Eye, Save } from 'lucide-react'

function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)

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
