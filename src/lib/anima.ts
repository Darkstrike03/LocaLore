import { supabase } from './supabaseClient'
import { ANIMA_REWARDS } from './currency'

type AnimaReason = keyof typeof ANIMA_REWARDS

/**
 * Awards anima to a user (best-effort, non-blocking).
 * Uses the increment_anima SECURITY DEFINER RPC so RLS never blocks it.
 * Writing the ledger entry is best-effort and won't prevent the balance update.
 */
export async function awardAnima(userId: string, reason: AnimaReason, referenceId?: string): Promise<void> {
  const amount = ANIMA_REWARDS[reason]
  if (!amount) return

  // Step 1: increment balance via SECURITY DEFINER RPC (bypasses RLS)
  const { error: rpcErr } = await supabase.rpc('increment_anima', { uid: userId, amount })
  if (rpcErr) {
    console.warn('[awardAnima] RPC error:', rpcErr.message)
    return
  }

  // Step 2: fetch new balance for the ledger entry (best-effort)
  try {
    const { data: u } = await supabase
      .from('users')
      .select('anima_balance')
      .eq('id', userId)
      .maybeSingle()
    const newBalance = (u as { anima_balance?: number } | null)?.anima_balance ?? amount
    await supabase.from('anima_ledger').insert({
      user_id:      userId,
      amount,
      balance_after: newBalance,
      reason:        reason.replaceAll('_', ' '),
      reference_id:  referenceId ?? null,
    })
  } catch {
    // ledger write is optional — balance already updated above
  }
}
