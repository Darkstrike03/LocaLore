/** Upload an image file to ImgBB and return the hosted URL */
export async function uploadImage(file: File): Promise<string> {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY as string | undefined
  if (!apiKey) {
    throw new Error('VITE_IMGBB_API_KEY is not set. Add it to your .env file.')
  }

  const form = new FormData()
  form.append('image', file)

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    throw new Error(`ImgBB upload failed: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()

  if (!json.success) {
    throw new Error(json.error?.message ?? 'ImgBB upload failed — check your API key.')
  }

  return json.data.url as string
}
