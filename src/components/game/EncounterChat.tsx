import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { UserCard } from '../../types/cards'
import { Send, AlertTriangle, ChevronRight } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface EncounterChatProps {
  card: UserCard & { definition: NonNullable<UserCard['definition']> }
  onGameOver: (result: 'win' | 'loss', upgradeDetails?: any) => void
}

const ENCOUNTER_DURATION_MS = 5 * 60 * 1000
const MIN_REQUEST_INTERVAL_MS = 2000

export default function EncounterChat({ card, onGameOver }: EncounterChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(ENCOUNTER_DURATION_MS)
  const [error, setError] = useState<string | null>(null)
  const [lastRequestAt, setLastRequestAt] = useState<number>(0)
  const [hasEnded, setHasEnded] = useState(false)
  const [encounterStartTime, setEncounterStartTime] = useState<number>(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const creature = card.definition.creature

  // Initial creeping text message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `hey... are you there? i think something just moved outside the door and it sounds wrong. i dont know if i should stay or run.`
    }])
  }, [creature.name])

  useEffect(() => {
    setTimeLeft(ENCOUNTER_DURATION_MS)
    setHasEnded(false)
    setLastRequestAt(0)
    setEncounterStartTime(Date.now())
  }, [creature.name])

  useEffect(() => {
    if (loading || hasEnded) return

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(prev - 1000, 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, hasEnded])

  useEffect(() => {
    if (timeLeft <= 0 && !hasEnded) {
      handleEncounterEnd('loss')
    }
  }, [timeLeft, hasEnded])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!input.trim() || loading || timeLeft <= 0 || hasEnded) return

    const now = Date.now()
    if (now - lastRequestAt < MIN_REQUEST_INTERVAL_MS) {
      setError('Slow down a bit — wait a moment before sending the next message.')
      return
    }

    const userMsg = input.trim()
    setInput('')
    setError(null)
    setLastRequestAt(now)

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No active session")

      const elapsedSeconds = Math.floor((Date.now() - encounterStartTime) / 1000)

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/encounter-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          cardId: card.id,
          messages: newMessages,
          elapsedSeconds
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        const errorMessage = errorData?.error || "Failed to commune with the entity."
        throw new Error(errorMessage)
      }

      const data = await res.json()
      let reply: string = data.reply

      // Check win condition
      const hasWon = reply.includes('[WIN_CONDITION_MET]')
      if (hasWon) {
        reply = reply.replace('[WIN_CONDITION_MET]', '').trim()
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply || "i cant hear anything back..." }])

      if (hasWon) {
        handleEncounterEnd('win')
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || "An unknown error occurred in the void.")
      // Remove the user's last message so they can try again without duplicate history
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  async function handleEncounterEnd(result: 'win' | 'loss') {
    if (hasEnded) return
    setHasEnded(true)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No active session")

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/settle-encounter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          cardId: card.id,
          result
        })
      })

      if (!res.ok) {
        throw new Error("Failed to settle the encounter.")
      }

      const data = await res.json()
      onGameOver(result, data)
    } catch (err: any) {
      console.error(err)
      setError("Failed to record the outcome. The void fluctuates...")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[75vh] max-w-3xl mx-auto border border-app-border bg-void/80 rounded-xl overflow-hidden shadow-void-deep relative backdrop-blur-md">
      
      {/* Header */}
      <div className="bg-app-surface/90 border-b border-app-border p-4 flex items-center justify-between z-10">
        <div>
          <h2 className="font-heading text-lg tracking-[0.1em] text-crimson animate-pulse">The Encounter</h2>
          <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted">Catalyst: Unknown Entity</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`font-ui text-xs uppercase tracking-[0.15em] px-3 py-1 rounded border ${timeLeft <= 30000 ? 'text-crimson border-crimson/50 bg-crimson/10 animate-pulse' : 'text-parchment-muted border-app-border'}`}>
            Time Left: {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className={`text-[10px] font-ui uppercase tracking-[0.2em] mb-1 ${m.role === 'user' ? 'text-sky-300' : 'text-zinc-400'}`}>
              {m.role === 'user' ? 'You' : 'Him'}
            </span>
            <div className={`max-w-[85%] rounded-3xl p-4 font-body text-sm leading-relaxed shadow-sm ${
              m.role === 'user' 
                ? 'bg-sky-500/15 border border-sky-400/25 text-sky-100 self-end' 
                : 'bg-zinc-900/95 border border-zinc-700 text-zinc-100 self-start'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-ui uppercase tracking-[0.2em] mb-1 text-zinc-400">Him</span>
            <div className="max-w-[65%] rounded-3xl p-4 bg-zinc-900/95 border border-zinc-700 text-zinc-300 shadow-sm">
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                typing<span className="inline-block h-2 w-2 rounded-full bg-zinc-400 animate-pulse"></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-crimson/90 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 font-ui text-xs z-50">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-app-surface/90 border-t border-app-border backdrop-blur-md">
        <form onSubmit={handleSend} className="relative flex items-center">
          <ChevronRight className="absolute left-3 h-5 w-5 text-crimson/50" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || timeLeft <= 0 || hasEnded}
            placeholder="reply quickly..."
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-full pl-12 pr-12 py-3 font-body text-zinc-100 focus:outline-none focus:border-sky-400 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || timeLeft <= 0 || hasEnded}
            className="absolute right-2 p-2 rounded-md text-crimson/70 hover:text-crimson hover:bg-crimson/10 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

    </div>
  )
}
