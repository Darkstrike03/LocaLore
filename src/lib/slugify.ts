/**
 * Generate a URL-safe slug from a creature name
 * Example: "Kappa (River Spirit)" → "kappa-river-spirit"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')     // Trim hyphens from ends
}
