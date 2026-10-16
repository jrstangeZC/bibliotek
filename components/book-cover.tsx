"use client"

import Image, { type ImageProps } from "next/image"
import { useState, type ReactNode } from "react"

/**
 * A book's cover, or `fallback` when there is none: no usable ISBN, or Open
 * Library has no cover for it (a 404, see `lib/covers.ts`) or cannot be
 * reached. `next/image` re-fires an error that happened before hydration, so
 * the fallback shows for a cover that failed on the first paint too.
 */
export function BookCover({
  src,
  alt,
  fallback,
  onError,
  ...props
}: Omit<ImageProps, "src"> & {
  src: string | null
  fallback: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return fallback

  return (
    <Image
      src={src}
      alt={alt}
      draggable={false}
      onError={(event) => {
        setFailed(true)
        onError?.(event)
      }}
      {...props}
    />
  )
}
