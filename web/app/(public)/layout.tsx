import { SiteFooter, SiteHeader } from '@/components/layout/SiteHeader';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="konten" tabIndex={-1} className="outline-none flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
