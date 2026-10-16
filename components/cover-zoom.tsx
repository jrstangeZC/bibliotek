"use client"

import Image from "next/image"
import { useRef, useState, type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

import { BookCover } from "@/components/book-cover"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Long enough that a pointer passing over a cover — or dragging the carousel — does not open it. */
const HOVER_DELAY_MS = 300

/** Covers are usually 2:3; the real ratio replaces this once the cover has loaded. */
const DEFAULT_RATIO = 2 / 3

type Point = { x: number; y: number }
type Size = { width: number; height: number }

/**
 * How wide the large cover is drawn: its real size, one image pixel per CSS
 * pixel, unless that breaks the 15 % margin — then as large as fits within
 * 70 % of the width and 70 % of the height, proportions kept. The optimizer
 * never enlarges, so the large image's natural size is the cover's own.
 * Until it has loaded, only the fit is known.
 */
function zoomWidth(natural: Size | null, ratio: number): string {
  const fit = `70vw, calc(70dvh * ${ratio})`
  return natural ? `min(${natural.width}px, ${fit})` : `min(${fit})`
}

/**
 * A cover that opens over the whole screen when the pointer rests on it (or
 * when it is pressed, for touch and keyboard). The large cover shows at its
 * real size when that fits, scaled down when it does not, and always leaves
 * at least 15 % of the screen free on every side (`zoomWidth`).
 * Escape, a press anywhere but the cover, or the X in the corner closes it.
 *
 * After closing, a cover still under the pointer does not reopen until the
 * pointer has left it once — otherwise closing with Escape would bring it
 * straight back.
 */
export function CoverZoom({
  src,
  title,
  className,
  fallback,
}: {
  src: string | null
  title: string
  /** For the cover in place; the large one sizes itself. */
  className?: string
  fallback: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [ratio, setRatio] = useState(DEFAULT_RATIO)
  const [failed, setFailed] = useState(false)
  const [natural, setNatural] = useState<Size | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const armed = useRef(true)
  const pointer = useRef<Point | null>(null)

  const alt = `Omslaget til «${title}»`

  if (!src || failed) return fallback

  function cancelPending() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  function track(event: { clientX: number; clientY: number }) {
    pointer.current = { x: event.clientX, y: event.clientY }
  }

  function close() {
    setOpen(false)
    const rect = triggerRef.current?.getBoundingClientRect()
    const at = pointer.current
    const overCover =
      rect && at
        ? at.x >= rect.left &&
          at.x <= rect.right &&
          at.y >= rect.top &&
          at.y <= rect.bottom
        : false
    armed.current = !overCover
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Vis omslaget til «${title}» i full størrelse`}
        className="block cursor-zoom-in rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onMouseEnter={(event) => {
          track(event)
          if (!armed.current) return
          cancelPending()
          timer.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS)
        }}
        onMouseMove={track}
        onMouseLeave={() => {
          cancelPending()
          if (!open) armed.current = true
        }}
        onPointerDown={cancelPending}
        onClick={() => {
          cancelPending()
          setOpen(true)
        }}
      >
        <BookCover
          src={src}
          alt={alt}
          width={200}
          height={300}
          className={className}
          fallback={fallback}
          onLoad={(event) => {
            const img = event.currentTarget
            if (img.naturalHeight > 0) {
              setRatio(img.naturalWidth / img.naturalHeight)
            }
          }}
          onError={() => setFailed(true)}
        />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="inset-0 top-0 left-0 grid h-dvh w-screen max-w-none translate-x-0 translate-y-0 place-items-center rounded-none bg-transparent p-0 ring-0 sm:max-w-none"
          onPointerMove={track}
          onPointerDown={track}
          onClick={(event) => {
            // The popup fills the screen; a press that lands on it rather than
            // on the cover or the X is a press outside the cover.
            if (event.target === event.currentTarget) close()
          }}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <Image
            src={src}
            alt={alt}
            width={natural?.width ?? Math.round(1000 * ratio)}
            height={natural?.height ?? 1000}
            sizes="70vw"
            draggable={false}
            // Hidden until loaded, so a small cover never flashes at the full
            // fit before shrinking to its real size.
            className={cn(
              "rounded-lg transition-opacity duration-100",
              natural ? "opacity-100" : "opacity-0"
            )}
            style={{ width: zoomWidth(natural, ratio), height: "auto" }}
            onLoad={(event) => {
              const img = event.currentTarget
              if (img.naturalHeight === 0) return
              setRatio(img.naturalWidth / img.naturalHeight)
              // With a `w`-descriptor srcset, `naturalWidth` is divided by the
              // density the browser picked (1200w for a 1120 px slot reads a
              // 342 px cover as 319), so it is not the cover's pixels. A plain
              // image of the same, already cached, file is.
              const probe = new window.Image()
              probe.onload = () =>
                setNatural({
                  width: probe.naturalWidth,
                  height: probe.naturalHeight,
                })
              probe.src = img.currentSrc
            }}
          />
          <DialogClose
            aria-label="Lukk"
            className={buttonVariants({
              variant: "secondary",
              size: "icon",
              className: "absolute top-4 right-4",
            })}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}
