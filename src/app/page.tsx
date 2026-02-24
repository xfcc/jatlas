import { ActressTable } from '@/components/actress/ActressTable';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <Link href="/tiers">
          <Button variant="outline">Manage Tiers</Button>
        </Link>
        <ThemeToggle />
      </div>
      <ActressTable />
    </main>
  );
}
