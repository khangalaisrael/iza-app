import { SiteHeader } from "./SiteChrome";

// The frame for the working screens (runner, Iza point, business, team): the website's top bar, then wide on a computer and one column on a phone.
export default function PortalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="portal">
      <SiteHeader />
      <div className="portalCrumb">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <main className="portalMain">{children}</main>
    </div>
  );
}
