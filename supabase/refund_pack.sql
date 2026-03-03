-- ============================================================
-- LocaLore — Refund Failed Pack Opening
-- ============================================================
-- Step 1: Run the SELECT below to see what was deducted.
-- Step 2: Uncomment and run the UPDATE block to refund it.
-- ============================================================

-- ── Step 1: Find the deduction(s) ────────────────────────────
SELECT
  al.id,
  al.user_id,
  u.username,
  al.amount,
  al.balance_after,
  al.reason,
  al.created_at
FROM public.anima_ledger al
JOIN public.users u ON u.id = al.user_id
WHERE al.amount < 0            -- only debits
  AND al.reason ILIKE '%opened%'
ORDER BY al.created_at DESC
LIMIT 10;
-- ✅ You should see the bad pack charge here.
--    Note the user_id and the amount (it'll be negative, e.g. -200).


-- ── Step 2: Refund — replace <USER_ID> with your user id ─────
-- Copy your user_id from the result above, paste it below, then
-- uncomment all lines from UPDATE to the end and run again.

-- UPDATE public.users
-- SET anima_balance = anima_balance + ABS((
--   SELECT amount FROM public.anima_ledger
--   WHERE user_id = '<USER_ID>'
--     AND amount < 0
--     AND reason ILIKE '%opened%'
--   ORDER BY created_at DESC
--   LIMIT 1
-- ))
-- WHERE id = '<USER_ID>';

-- -- Log the refund in the ledger
-- INSERT INTO public.anima_ledger (user_id, amount, balance_after, reason)
-- SELECT
--   '<USER_ID>',
--   ABS(l.amount),
--   u.anima_balance,
--   'Refund: ' || l.reason
-- FROM public.anima_ledger l
-- JOIN public.users u ON u.id = '<USER_ID>'::uuid
-- WHERE l.user_id = '<USER_ID>'
--   AND l.amount  < 0
--   AND l.reason ILIKE '%opened%'
-- ORDER BY l.created_at DESC
-- LIMIT 1;

-- -- Confirm new balance
-- SELECT id, username, anima_balance FROM public.users WHERE id = '<USER_ID>';
