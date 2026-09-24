import { Logo } from '@/components/common/Bits';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-content items-center px-4 md:px-8">
          <Logo />
        </div>
      </header>
      <main id="konten" tabIndex={-1} className="outline-none flex flex-1 items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
