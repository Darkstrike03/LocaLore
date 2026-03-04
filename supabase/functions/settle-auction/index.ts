import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { auctionId } = await req.json() as { auctionId: string }
    if (!auctionId) return new Response('Missing auctionId', { status: 400 })

    // Use service role so settle_auction can run with elevated permissions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Guard: skip if not yet expired (client timers can be slightly off)
    const { data: listing } = await supabase
      .from('auction_listings')
      .select('status, ends_at')
      .eq('id', auctionId)
      .maybeSingle()

    if (!listing) return new Response('Not found', { status: 404 })
    if (listing.status !== 'active') return new Response('Already settled', { status: 200 })
    if (new Date(listing.ends_at) > new Date()) {
      return new Response('Not expired yet', { status: 200 })
    }

    const { error } = await supabase.rpc('settle_auction', { p_auction_id: auctionId })
    if (error) throw error

    return new Response('Settled', { status: 200 })
  } catch (err) {
    console.error('settle-auction error:', err)
    return new Response(String(err), { status: 500 })
  }
})
