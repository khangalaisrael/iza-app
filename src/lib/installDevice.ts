// Which way of adding Izza to a device fits the one in someone's hand. Each browser does it differently,
// and a website can only open the install box itself on Chrome, Edge and Android; everywhere else we show the taps.
export type InstallDevice = "iphone" | "mac-safari" | "android" | "computer";

export function installDevice(userAgent: string, touchPoints: number): InstallDevice {
  // An iPad reports itself as a Mac, but a Mac has no touch screen.
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1);
  if (ios) return "iphone";
  if (/Android/.test(userAgent)) return "android";
  const safari = /Safari/.test(userAgent) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(userAgent);
  if (/Macintosh/.test(userAgent) && safari) return "mac-safari";
  return "computer";
}

// The words on the card for each device. `steps` is shown when the browser can't open the install box itself.
export const INSTALL_COPY: Record<InstallDevice, { title: string; steps: string | null }> = {
  iphone: { title: "Add Izza to your home screen", steps: "Tap Share, then Add to Home Screen." },
  "mac-safari": { title: "Add Izza to your Dock", steps: "In the menu bar, choose File, then Add to Dock." },
  android: { title: "Add Izza to your home screen", steps: "Open the browser menu (⋮), then Add to Home screen." },
  // Chrome and Edge on a computer open their own install box. Other computer browsers can't install sites, so no steps.
  computer: { title: "Install Izza on this computer", steps: null },
};
