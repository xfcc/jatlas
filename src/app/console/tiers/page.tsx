import { getTiers } from '@/app/actions';
import { TierTable } from '@/components/tier/TierTable';

export default async function TiersPage() {
  const tiers = await getTiers();

  return (
    <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
            <div>
                <h2 className="text-3xl font-extrabold tracking-tight">层级字典</h2>
                <p className="text-base text-zinc-400 mt-2">管理和定义女优的评级体系</p>
            </div>
        </div>
        <TierTable tiers={tiers} />
    </div>
  );
}