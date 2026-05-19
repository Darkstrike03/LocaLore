import { useState } from 'react'
import EncounterCardSelector from './EncounterCardSelector'
import EncounterChat from './EncounterChat'
import type { UserCard } from '../../types/cards'
import { Skull, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react'

export default function EncounterGame() {
  const [selectedCard, setSelectedCard] = useState<(UserCard & { definition: NonNullable<UserCard['definition']> }) | null>(null)
  const [gameOverResult, setGameOverResult] = useState<'win' | 'loss' | null>(null)
  const [upgradeDetails, setUpgradeDetails] = useState<any>(null)

  const handleSelectCard = (card: UserCard & { definition: NonNullable<UserCard['definition']> }) => {
    setSelectedCard(card)
    setGameOverResult(null)
    setUpgradeDetails(null)
  }

  const handleGameOver = (result: 'win' | 'loss', details?: any) => {
    setGameOverResult(result)
    setUpgradeDetails(details)
  }

  const handleReset = () => {
    setSelectedCard(null)
    setGameOverResult(null)
    setUpgradeDetails(null)
  }

  if (gameOverResult) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        {gameOverResult === 'win' ? (
          <div className="space-y-6">
            <ShieldCheck className="h-24 w-24 text-gold mx-auto animate-pulse" />
            <h2 className="font-heading text-4xl tracking-[0.1em] text-gold">Mystery Solved</h2>
            <p className="font-body text-parchment-muted max-w-lg mx-auto">
              You correctly deduced the entity's nature and exploited its weakness. The curse is broken.
            </p>
            <div className="bg-app-surface border border-gold/30 p-6 rounded-xl inline-block mt-4 shadow-gold-glow">
              <h3 className="font-ui text-xs uppercase tracking-[0.2em] text-gold mb-2">Rewards</h3>
              {upgradeDetails?.action === 'rarity_upgraded' && (
                <p className="text-parchment">Manifest rarity evolved to <span className="text-gold font-bold">{upgradeDetails.newRarity}</span></p>
              )}
              {upgradeDetails?.action === 'grade_upgraded' && (
                <p className="text-parchment">Manifest grade restored to <span className="text-emerald-400 font-bold">{upgradeDetails.newGrade}</span></p>
              )}
              {upgradeDetails?.action === 'maxed_out' && (
                <p className="text-parchment text-amber-400">The manifest is already at its ultimate form. You survived, but gained no new power.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Skull className="h-24 w-24 text-crimson mx-auto animate-pulse" />
            <h2 className="font-heading text-4xl tracking-[0.1em] text-crimson">Consumed by the Void</h2>
            <p className="font-body text-parchment-muted max-w-lg mx-auto">
              You failed to understand the entity. The manifest has been shattered and lost to the archive forever.
            </p>
          </div>
        )}
        
        <div className="mt-12">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-app-surface border border-app-border rounded-lg text-parchment-muted hover:text-parchment hover:border-gold/50 transition-all font-ui text-xs uppercase tracking-[0.2em]"
          >
            <RefreshCw className="h-4 w-4" /> Return to Selection
          </button>
        </div>
      </div>
    )
  }

  if (selectedCard) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <button
          onClick={handleReset}
          className="mb-6 flex items-center gap-2 text-parchment-muted hover:text-parchment transition-colors font-ui text-[10px] uppercase tracking-[0.2em]"
        >
          <ArrowLeft className="h-4 w-4" /> Change Catalyst
        </button>
        <EncounterChat card={selectedCard} onGameOver={handleGameOver} />
      </div>
    )
  }

  return <EncounterCardSelector onSelect={handleSelectCard} />
}
