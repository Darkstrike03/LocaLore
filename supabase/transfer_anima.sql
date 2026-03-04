-- transfer_anima
-- Moves anima from one user to another atomically with ledger entries.
-- Callable by the sender: auth.uid() MUST equal p_from_user_id.

create or replace function public.transfer_anima(
  p_from_user_id uuid,
  p_to_user_id   uuid,
  p_amount       integer,
  p_reason       text default 'transfer'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Caller must be the sender
  if auth.uid() <> p_from_user_id then
    raise exception 'Forbidden';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  -- Lock rows in consistent order to prevent deadlocks
  perform id from users where id in (
    least(p_from_user_id, p_to_user_id),
    greatest(p_from_user_id, p_to_user_id)
  ) order by id for update;

  -- Check balance
  if (select anima_balance from users where id = p_from_user_id) < p_amount then
    raise exception 'Insufficient anima';
  end if;

  -- Move funds
  update users set anima_balance = anima_balance - p_amount
  where id = p_from_user_id;

  update users set anima_balance = anima_balance + p_amount
  where id = p_to_user_id;

  -- Ledger
  insert into anima_ledger (user_id, delta, reason, metadata)
  values
    (p_from_user_id, -p_amount, p_reason,
      jsonb_build_object('to_user_id', p_to_user_id)),
    (p_to_user_id,   p_amount,  p_reason,
      jsonb_build_object('from_user_id', p_from_user_id));
end;
$$;

-- Only authenticated users can call this (row-level caller check is inside)
revoke all on function public.transfer_anima from anon;
grant execute on function public.transfer_anima to authenticated;
