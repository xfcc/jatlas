
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ConsoleState from './ConsoleState';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConsoleState>
      <div className="antialiased min-h-screen flex overflow-hidden bg-zinc-950">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          <Header />
          <div className="p-8 flex-1">
              {children}
          </div>
        </main>
      </div>
    </ConsoleState>
  );
}
