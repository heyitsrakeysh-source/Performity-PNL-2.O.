import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_BOOT_SCRIPT } from "@/components/shell/ThemeProvider";
import { ToastProvider } from "@/components/shell/Toast";
import { WorkspaceProvider } from "@/lib/store";
import { AppShell } from "@/components/shell/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Performity · Profitability Intelligence",
    template: "%s · Performity",
  },
  description:
    "A profitability intelligence platform for D2C brands: live P&L, unit economics, forecasting and margin-leak analysis.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#090b12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <WorkspaceProvider>
              <AppShell>{children}</AppShell>
            </WorkspaceProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
