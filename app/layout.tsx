import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { ServiceWorkerBridge } from "@/components/pwa/ServiceWorkerBridge";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-figtree" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  title: "Zakat Kit",
  description:
    "Work out the zakat you owe, from every account you hold, and see the working. Free, private, and grounded in the sources. A calculator, not a ruling.",
  applicationName: "Zakat Kit",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // iOS reads these rather than the manifest, so an installed copy on an
  // iPhone depends entirely on this block.
  appleWebApp: {
    capable: true,
    title: "Zakat Kit",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  other: {
    // Next emits the standard `mobile-web-app-capable`, which iOS has
    // honoured since 16.4. The legacy spelling is here for the older phones
    // a good part of this app's audience is actually holding.
    "apple-mobile-web-app-capable": "yes",
  },
};

/**
 * Two theme colours, because the app has two themes and the one in the
 * manifest can only be a single value. A light bar above a dark page is the
 * sort of seam that makes an installed app feel like a web page in a costume.
 */
export const viewport: Viewport = {
  themeColor: "#5b1f6b",
  // Lets the page reach under the notch once it is installed.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${bricolage.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <ServiceWorkerBridge />
      </body>
    </html>
  );
}
