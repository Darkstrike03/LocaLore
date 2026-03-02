export type CreatureType =
  | 'spirit'
  | 'demon'
  | 'trickster'
  | 'water_creature'
  | 'shapeshifter'
  | 'undead'
  | 'other'

export type CreatureSource = 'user_submitted' | 'ai_collected'

export type ReactionType =
  | 'seen' | 'chilling' | 'disbelief'
  | 'terrified' | 'survived' | 'cursed' | 'revered' | 'haunted' | 'hunting'

export type XpEventType =
  | 'submit_creature' | 'creature_verified' | 'comment' | 'react'
  | 'bookmark_received' | 'sighting_filed'

export interface CreatureImage {
  id: string
  creature_id: string
  url: string
  caption: string | null
  uploaded_by: string | null
  created_at: string
}

export interface SightingReport {
  id: string
  creature_id: string
  user_id: string | null
  display_name: string | null
  latitude: number
  longitude: number
  description: string | null
  created_at: string
}

export interface XpEvent {
  id: string
  user_id: string
  event_type: XpEventType
  xp_amount: number
  reference_id: string | null
  created_at: string
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

/** Row shape for the `creatures` table (curated / approved entries) */
export interface Creature {
  id: string
  slug: string
  name: string
  alternate_names: string[]
  region: string | null
  country: string | null
  locality: string | null
  latitude: number | null
  longitude: number | null
  creature_type: CreatureType
  description: string
  origin_story: string | null
  abilities: string | null
  survival_tips: string | null
  image_url: string | null
  model_url: string | null
  verified: boolean
  danger_rating: number | null
  source: CreatureSource
  submitted_by: string | null
  created_at: string
  updated_at: string
}

/** Row shape for the `submissions` table (user-submitted, pending review) */
export interface Submission {
  id: string
  submitted_by: string
  slug: string | null
  name: string
  alternate_names: string[]
  region: string | null
  country: string | null
  locality: string | null
  latitude: number | null
  longitude: number | null
  creature_type: CreatureType
  description: string
  origin_story: string | null
  abilities: string | null
  survival_tips: string | null
  image_url: string | null
  status: SubmissionStatus
  reviewed_by: string | null
  review_note: string | null
  creature_id: string | null
  created_at: string
  updated_at: string
}

/** Insert payload for the `submissions` table */
export type SubmissionInsert = {
  submitted_by: string
  slug?: string
  name: string
  alternate_names?: string[]
  region?: string | null
  country?: string | null
  locality?: string | null
  latitude?: number | null
  longitude?: number | null
  creature_type: CreatureType
  description: string
  origin_story?: string | null
  abilities?: string | null
  survival_tips?: string | null
  image_url?: string | null
}


