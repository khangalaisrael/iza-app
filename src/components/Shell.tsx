import { SiteHeader } from "./SiteChrome";

// The frame for the public screens (send, collect, track, sign in). Every page in the app has the same three parts,
// in the same places: the top bar, a title row, then the content. Nothing moves when you change page.
export default function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="portal">
      <SiteHeader />
      <div className="portalCrumb">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <main className="portalMain narrow">{children}</main>
    </div>
  );
}
