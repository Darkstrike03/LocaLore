export type CreatureType =
  | 'spirit'
  | 'demon'
  | 'trickster'
  | 'water_creature'
  | 'shapeshifter'
  | 'undead'
  | 'other'

export type CreatureSource = 'user_submitted' | 'ai_collected'

export interface Creature {
  id: string
  name: string
  alternate_names: string[]
  region: string
  country: string
  locality: string
  latitude: number
  longitude: number
  creature_type: CreatureType
  description: string
  origin_story: string
  abilities: string
  survival_tips: string
  image_url: string | null
  verified: boolean
  source: CreatureSource
  submitted_by: string | null
  created_at: string
}

