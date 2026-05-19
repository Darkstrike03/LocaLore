import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { UserCard } from '../../types/cards'
import { Skull, Eye, ArrowRight } from 'lucide-react'

interface EncounterCardSelectorProps {
  onSelect: (card: UserCard & { definition: NonNullable<UserCard['definition']> }) => void;
}

export default function EncounterCardSelector({ onSelect }: EncounterCardSelectorProps) {
  const { user } = useAuth()
  const [cards, setCards] = useState<(UserCard & { definition: NonNullable<UserCard['definition']> })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCards() {
      if (!user) return
      setLoading(true)
      const { data } = await supabase
        .from('user_cards')
        .select('*, definition:card_definitions!card_def_id(*, creature:creatures!creature_id(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      // Filter out maxed cards if needed, e.g., void_touched and mint
      const validCards = (data ?? []).filter((c: any) => {
        return !(c.definition.rarity === 'void_touched' && c.grade === 'mint')
      })

      setCards(validCards as any)
      setLoading(false)
    }
    loadCards()
  }, [user])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Eye className="h-8 w-8 text-crimson animate-pulse" />
        <p className="font-ui text-xs uppercase tracking-[0.2em] text-crimson">Consulting the Archive...</p>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <Skull className="h-10 w-10 text-parchment-muted/30" />
        <p className="font-heading text-xl text-parchment-muted">You have no eligible manifests.</p>
        <p className="text-sm text-parchment-muted">
          Only cards that have not reached their ultimate form (Void-Touched Mint) may enter the Encounter.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      <div className="text-center mb-6 sm:mb-10">
        <h2 className="font-heading text-2xl sm:text-3xl tracking-[0.1em] text-crimson mb-2">Select Your Catalyst</h2>
        <p className="font-body text-xs sm:text-sm text-parchment-muted max-w-2xl mx-auto">
          Choose a manifest to invoke its entity. Solve the mystery to upgrade the manifest. <strong className="text-crimson">Fail, and the manifest will be consumed by the void. forever.</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
        {cards.map((card) => {
          const rarityColors: Record<string, string> = {
            'whisper': 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
            'remnant': 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
            'manifestation': 'border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]',
            'awakened': 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
            'ephemeral': 'border-amber-500/50 shadow-[0_0_15px_rgba(217,119,6,0.3)]',
            'void_touched': 'border-black/80 shadow-[0_0_20px_rgba(0,0,0,0.8)]'
          }
          const rarityColor = rarityColors[card.definition.rarity] || 'border-zinc-700'
          
          const rarityLabels: Record<string, string> = {
            'whisper': '✦',
            'remnant': '✦✦',
            'manifestation': '✦✦✦',
            'awakened': '✦✦✦✦',
            'ephemeral': '✦✦✦✦✦',
            'void_touched': '◆'
          }
          const rarityLabel = rarityLabels[card.definition.rarity] || '?'
          
          return (
            <div 
              key={card.id} 
              className="relative group cursor-pointer"
              onClick={() => onSelect(card)}
            >
              {/* Unknown card display with rarity indicators */}
              <div className={`relative w-full bg-black border-2 rounded-xl overflow-hidden aspect-[2/3] flex flex-col items-center justify-center gap-3 hover:border-crimson/50 transition-all group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] ${rarityColor}`}>
                {/* Rarity badge */}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur border border-zinc-600 px-2 py-1 rounded text-[9px] uppercase tracking-wider text-zinc-300 font-bold">
                  {rarityLabel}
                </div>
                
                <div className="text-center space-y-2">
                  <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-zinc-400">Unknown Entity</p>
                  <Eye className="h-8 w-8 text-zinc-600 mx-auto" />
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex justify-between px-3 text-[10px] uppercase tracking-[0.15em]">
                  <span className="text-zinc-500">{card.definition.rarity}</span>
                  <span className="text-zinc-500">{card.grade}</span>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center rounded-xl backdrop-blur-[1px] border border-crimson/50">
                <Skull className="h-6 w-6 text-crimson mb-2" />
                <span className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment bg-crimson/20 px-2 py-1 rounded border border-crimson/40 flex items-center gap-1">
                  Risk Manifest <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
