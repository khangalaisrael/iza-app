import { SiteHeader } from "./SiteChrome";

// The frame for the public screens (send, collect, track, sign in): the website's top bar, then one readable column.
export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="shell">
        <main className="page">{children}</main>
      </div>
    </>
  );
}
