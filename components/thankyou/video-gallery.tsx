"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Play, VolumeX } from "lucide-react"
import { VIDEOS, type VideoEntry } from "@/lib/thank-you-videos"

/**
 * Thank-you video gallery (client) — FLAT list, Blob-hosted <video> player.
 *
 * Adapted from jenkins-homebuyers' gallery, but without the category accordion
 * (Hidden Gem has only 4 videos). The player is a Blob-hosted <video> and all
 * brand color comes from the `accentColor` prop.
 *
 * NOTE: do NOT import "@/lib/config" here — this is a client component. Branding
 * is passed in as props from the server page.
 */

const BLOB_BASE = process.env.NEXT_PUBLIC_BLOB_BASE_URL ?? ""

/**
 * Encode one path segment to match Vercel Blob's canonical URL encoding.
 * encodeURIComponent leaves !'()*~ unescaped, but the blob store percent-encodes
 * them, so we encode those too. Slashes are preserved by encoding per-segment.
 */
function encodeSegment(seg: string): string {
  return encodeURIComponent(seg).replace(
    /[!'()*~]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  )
}

function buildSrc(file: string): string {
  const encoded = file.split("/").map(encodeSegment).join("/")
  return `${BLOB_BASE}/${encoded}`
}

interface PlayableVideo extends VideoEntry {
  src: string
}

interface ChapterItemProps {
  video: PlayableVideo
  index: number
  isActive: boolean
  accentColor: string
  onClick: () => void
}

function ChapterItem({ video, index, isActive, accentColor, onClick }: ChapterItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
        isActive ? "text-white" : "hover:bg-gray-100 text-gray-700"
      }`}
      style={isActive ? { backgroundColor: accentColor } : undefined}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
        }`}
      >
        {isActive ? <Play className="h-3.5 w-3.5 fill-current" /> : index + 1}
      </div>
      <span className={`text-sm font-medium line-clamp-2 ${isActive ? "text-white" : "text-gray-800"}`}>
        {video.title}
      </span>
    </button>
  )
}

interface VideoGalleryProps {
  accentColor: string
}

export function VideoGallery({ accentColor }: VideoGalleryProps) {
  const playable = useMemo<PlayableVideo[]>(
    () => VIDEOS.map((v) => ({ ...v, src: buildSrc(v.file) })),
    []
  )

  const [selected, setSelected] = useState<PlayableVideo | null>(playable[0] ?? null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // The first video autoplays muted with a "tap for sound" overlay. Once the
  // user unmutes OR picks any chapter, we treat them as having interacted:
  // subsequent videos play normally (with sound) and the overlay never returns.
  const [hasInteracted, setHasInteracted] = useState(false)

  // Autoplay on each video mount. The <video> is keyed by src, so it remounts
  // per selection and this effect re-runs. muted is set on the DOM node (React
  // does not reliably reflect the muted prop), otherwise browsers block autoplay.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !hasInteracted
    v.play().catch(() => {
      /* autoplay may be blocked; native controls / overlay still allow manual play */
    })
    // hasInteracted intentionally omitted: unmuting is handled by handleUnmute,
    // and chapter picks change selected.src which re-runs this with the latest value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.src])

  const handleSelect = (video: PlayableVideo) => {
    setHasInteracted(true)
    setSelected(video)
  }

  const handleUnmute = () => {
    const v = videoRef.current
    if (v) {
      v.muted = false
      v.currentTime = 0
      v.play().catch(() => {})
    }
    setHasInteracted(true)
  }

  if (!selected) return null

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Main player */}
      <div className="flex-1">
        <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
          <div className="relative aspect-video w-full">
            {/* key forces a remount so only the selected video element loads */}
            <video
              key={selected.src}
              ref={videoRef}
              src={selected.src}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full"
            />
            {!hasInteracted && (
              <button
                type="button"
                onClick={handleUnmute}
                aria-label="Tap for sound: unmute and restart the video"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40 text-white transition-colors hover:bg-black/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/70"
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  <VolumeX className="h-8 w-8" />
                </span>
                <span className="text-sm font-semibold tracking-wide">Tap for sound</span>
              </button>
            )}
          </div>
          <div className="bg-gray-900 px-5 py-3">
            <h3 className="text-base font-semibold text-white">{selected.title}</h3>
          </div>
        </div>
      </div>

      {/* Chapters list */}
      <div className="w-full lg:w-80 xl:w-96">
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Video Chapters</h3>
            <p className="text-xs text-gray-500">{playable.length} videos</p>
          </div>
          <div className="space-y-1 p-2">
            {playable.map((video, idx) => (
              <ChapterItem
                key={video.src}
                video={video}
                index={idx}
                isActive={video.src === selected.src}
                accentColor={accentColor}
                onClick={() => handleSelect(video)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
