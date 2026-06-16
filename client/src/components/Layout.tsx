import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  isOffline: boolean;
}

export default function Layout({ children, isOffline }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center font-bold text-sm border border-white/20">
              JJ
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">Jalan Jyothi</h1>
              <p className="text-[11px] text-indigo-200 font-medium">Business Management System</p>
            </div>
          </div>
          {isOffline && (
            <span className="bg-amber-400/90 text-amber-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              ⚡ Offline
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-3 text-center text-xs text-slate-400">
        Jalan Jyothi CRM &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
