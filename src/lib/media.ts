// Helpers for item photos and videos. New file: does not touch existing code.
export const MAX_IMAGES = 8
export const MAX_VIDEO_MB = 25
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export type NewMedia = { kind: 'image' | 'video'; path: string }

export function mediaUrl(kind: 'image' | 'video', path: string) {
  const bucket = kind === 'video' ? 'item-videos' : 'item-images'
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}
