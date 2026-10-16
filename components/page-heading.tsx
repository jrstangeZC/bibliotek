import type { ReactNode } from "react"

/**
 * The title block every page opens with: serif h1 over one muted sentence.
 * `aside` sits to the right of the title — a control that changes how the
 * whole page is shown, not an action on one record.
 */
export function PageHeading({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance">
          {title}
        </h1>
        {aside}
      </div>
      {children ? (
        <p className="mt-3 max-w-2xl text-sm/relaxed text-muted-foreground">
          {children}
        </p>
      ) : null}
    </div>
  )
}
