import { ActressTable } from '@/components/actress/ActressTable';
import { TierTable } from '@/components/tier/TierTable';
import Link from 'next/link';

export default function ConsolePage() {
  return (
    <div className="bg-black text-zinc-300 min-h-screen font-sans">
      {/* Header */}
      <header className="landing-container mx-auto py-6 flex justify-between items-center">
        <Link href="/" className="font-bold text-lg text-white tracking-wider">• JATLAS</Link>
        <span className="text-sm text-green-400">SYSTEM ONLINE</span>
      </header>

      {/* Main Content */}
      <main className="landing-container mx-auto py-12">
        <h1 className="text-4xl font-bold text-white mb-12">JATLAS 控制台</h1>
        <div className="space-y-12">
          <section className="bento-card">
            <h2 className="text-2xl font-bold text-white mb-6">女优梯队</h2>
            <TierTable />
          </section>
          <section className="bento-card">
            <h2 className="text-2xl font-bold text-white mb-6">女优列表</h2>
            <ActressTable />
          </section>
        </div>
      </main>
    </div>
  );
}
