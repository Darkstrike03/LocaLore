import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Eye } from 'lucide-react'

function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) { setLoading(false); return }
    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()
      if (!error && data) setProfile(data)
      setLoading(false)
    }
    void load()
  }, [username])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center">Loading…</div>
  if (!profile) return <div className="flex min-h-[60vh] items-center justify-center">Profile not found</div>

  return (
    <div className="min-h-screen bg-app-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-app-border bg-app-surface p-6 flex gap-6 items-center">
          <div className="h-24 w-24 rounded-lg overflow-hidden bg-void/20 flex items-center justify-center border border-app-border">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name || profile.username} className="h-full w-full object-cover"/> : <Eye className="h-10 w-10 text-parchment-dim" />}
          </div>
          <div>
            <h2 className="font-heading text-2xl text-gold">{profile.display_name || profile.username}</h2>
            <p className="text-parchment-muted">@{profile.username}</p>
            <p className="mt-3 text-parchment-dim">{profile.bio}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicProfilePage
