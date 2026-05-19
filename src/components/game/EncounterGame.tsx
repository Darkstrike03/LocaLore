import { useState } from 'react'
import EncounterCardSelector from './EncounterCardSelector'
import EncounterChat from './EncounterChat'
import type { UserCard } from '../../types/cards'
import { Skull, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react'

export default function EncounterGame() {
  const [selectedCard, setSelectedCard] = useState<(UserCard & { definition: NonNullable<UserCard['definition']> }) | null>(null)
  const [gameOverResult, setGameOverResult] = useState<'win' | 'loss' | null>(null)
  const [pendingResult, setPendingResult] = useState<'win' | 'loss' | null>(null)
  const [endingText, setEndingText] = useState<string | null>(null)
  const [endingLoading, setEndingLoading] = useState(false)
  const [endingError, setEndingError] = useState<string | null>(null)
  const [upgradeDetails, setUpgradeDetails] = useState<any>(null)

  const handleSelectCard = (card: UserCard & { definition: NonNullable<UserCard['definition']> }) => {
    setSelectedCard(card)
    setGameOverResult(null)
    setPendingResult(null)
    setEndingText(null)
    setEndingError(null)
    setUpgradeDetails(null)
  }

  const handleReset = () => {
    setSelectedCard(null)
    setGameOverResult(null)
    setPendingResult(null)
    setEndingText(null)
    setEndingError(null)
    setUpgradeDetails(null)
  }

  const handleRevealResult = () => {
    if (!pendingResult) return
    setGameOverResult(pendingResult)
    setPendingResult(null)
  }

  const downloadStory = () => {
    if (!endingText) return
    const blob = new Blob([endingText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'encounter-ending.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleGameOver = (result: 'win' | 'loss', context: any) => {
    setPendingResult(result)
    setUpgradeDetails(context.upgradeDetails)
    setEndingText(context.endingText || null)
    setEndingError(null)
    setEndingLoading(false)
  }

  if (pendingResult && !gameOverResult) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="space-y-6">
          <h2 className="font-heading text-4xl tracking-[0.1em] text-parchment">Story Extract</h2>
          <p className="font-ui text-xs uppercase tracking-[0.2em] text-parchment-muted">A recovered account of the encounter</p>

          <div className="bg-app-surface border border-app-border p-8 rounded-3xl shadow-void-deep text-left prose prose-invert mx-auto max-w-3xl">
            {endingLoading ? (
              <p className="font-body text-parchment-muted">Generating the closing story…</p>
            ) : endingError ? (
              <p className="font-body text-parchment-muted">{endingError}</p>
            ) : (
              <p className="font-body text-parchment whitespace-pre-line">{endingText}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={downloadStory}
              disabled={endingLoading || !endingText}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-app-border bg-app-surface text-parchment-muted hover:text-parchment transition-all font-ui text-xs uppercase tracking-[0.2em] disabled:opacity-50"
            >
              Download Story
            </button>

            <button
              onClick={handleRevealResult}
              disabled={endingLoading || !!endingError}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-crimson text-white hover:bg-crimson/90 transition-all font-ui text-xs uppercase tracking-[0.2em] disabled:opacity-50"
            >
              End
            </button>
          </div>
        </div>
      </div>
    )
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
                <p className="text-amber-400">The manifest is already at its ultimate form. You survived, but gained no new power.</p>
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
