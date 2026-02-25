import type { Creature } from '../types/creature'

export const mockCreatures: Creature[] = [
  {
    id: 'kappa-1',
    slug: 'kappa',
    name: 'Kappa',
    alternate_names: ['Gatarō'],
    region: 'Tohoku',
    country: 'Japan',
    locality: 'Kitakami River',
    latitude: 39.282,
    longitude: 141.113,
    creature_type: 'water_creature',
    description:
      'Amphibious river-dwelling yokai with a hollow on its head that must remain filled with water to maintain its strength.',
    origin_story:
      'Said to lurk in rivers and irrigation canals, Kappa were used to warn children away from dangerous waters and to explain drownings and disappearances.',
    abilities:
      'Incredible strength near water, expertise in grappling, and the ability to drag victims beneath the surface.',
    survival_tips:
      'Bow deeply to it; a polite Kappa will return the bow, spilling the water from its head and losing its strength. Offer cucumbers engraved with your name to appease it.',
    image_url: null,
    verified: true,
    source: 'ai_collected',
    submitted_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tengu-1',
    slug: 'tengu',
    name: 'Tengu',
    alternate_names: [],
    region: 'Kansai',
    country: 'Japan',
    locality: 'Mount Kurama, Kyoto',
    latitude: 35.1219,
    longitude: 135.7765,
    creature_type: 'spirit',
    description:
      'Mountain-dwelling yokai with avian features or long noses, guardians and tempters of arrogant monks and warriors.',
    origin_story:
      'Associated with remote shrines and martial arts, Tengu were once seen as disruptive demons but gradually became protectors of sacred mountains and esoteric knowledge.',
    abilities:
      'Mastery of swordsmanship, control of wind, illusions, and the ability to possess or mislead travelers.',
    survival_tips:
      'Show humility and respect when traveling in the mountains. Avoid boasting or desecrating shrines. Offer a short prayer at mountain temples before passing through.',
    image_url: null,
    verified: true,
    source: 'ai_collected',
    submitted_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kitsune-1',
    slug: 'kitsune',
    name: 'Kitsune',
    alternate_names: [],
    region: 'Kanto',
    country: 'Japan',
    locality: 'Inari Shrine outskirts, Tokyo',
    latitude: 35.6764,
    longitude: 139.65,
    creature_type: 'shapeshifter',
    description:
      'Fox spirit capable of taking human form, often appearing as a beautiful woman or mysterious stranger.',
    origin_story:
      'Linked with Inari shrines and rice agriculture, Kitsune stories range from tragic romances to elaborate deceptions and spiritual tests.',
    abilities:
      'Shapeshifting, creating illusions, possession, and conjuring foxfire that glows in the night.',
    survival_tips:
      'Question uncanny coincidences and too-perfect encounters. Look for subtle fox traits—shadows, tails, or reflections that betray the disguise.',
    image_url: null,
    verified: false,
    source: 'ai_collected',
    submitted_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

