import type { MetadataRoute } from "next";

/**
 * The install manifest.
 *
 * Installing matters more here than it does for most calculators. The student
 * this is for is working out their zakat on a phone, often on a data bundle
 * they are rationing, and often on campus wifi that comes and goes. An
 * installed copy opens from the home screen, starts without a network, and
 * does not cost them anything to open twice.
 *
 * `display: standalone` rather than fullscreen: the clock and the battery
 * stay visible, which is what somebody halfway through entering six figures
 * from a bank statement wants.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zakat Kit",
    short_name: "Zakat Kit",
    description:
      "Work out whether you owe zakat and what to set aside each month. A calculator, not a ruling.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait-primary",
    categories: ["finance", "utilities", "education"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
