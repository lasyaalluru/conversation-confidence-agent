import { AppNav } from "@/components/layout/AppNav";

// Shared shell for the warm, light "personal growth space": dashboard, library, progress, phrases, settings, feedback.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col bg-ivory">
      <AppNav />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 sm:px-6 md:pb-16 md:pt-12 lg:px-8">
        {children}
      </main>
    </div>
  );
}
