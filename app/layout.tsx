import type { Metadata } from "next"
import { cookies } from "next/headers"
import "./globals.css"
import { DM_Sans, Noto_Serif } from "next/font/google"
import { parseTheme, THEME_COOKIE } from "@/lib/theme"
import { cn } from "@/lib/utils"

const notoSerifHeading = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-heading",
})

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Bibliotek",
  description: "Utlånssystem for småbiblioteket",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)

  return (
    <html
      lang="no"
      className={cn(
        "h-full antialiased",
        "font-sans",
        dmSans.variable,
        notoSerifHeading.variable,
        theme === "dark" && "dark"
      )}
      style={{ colorScheme: theme }}
    >
      {/* Browser extensions inject attributes on <body> before hydration. */}
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-background text-foreground"
      >
        {children}
      </body>
    </html>
  )
}
