import type { Metadata } from "next";
import "./globals.css";
import { DM_Sans, Noto_Serif } from "next/font/google";
import { cn } from "@/lib/utils";

const notoSerifHeading = Noto_Serif({subsets:['latin'],variable:'--font-heading'});

const dmSans = DM_Sans({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Bibliotek",
  description: "Utlånssystem for småbiblioteket",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="no" className={cn("h-full antialiased", "font-sans", dmSans.variable, notoSerifHeading.variable)}>
      {/* Browser extensions inject attributes on <body> before hydration. */}
      <body suppressHydrationWarning className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
