import { BotStats } from '@/types/bot';
import { Swords, Coins, Droplets, Moon, Blocks, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface StatsPanelProps {
  stats: BotStats;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  glowClass?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ icon, label, value, color, glowClass }, ref) => {
    return (
      <div ref={ref} className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all hover:scale-[1.02]",
        "bg-gradient-to-br from-card to-secondary/20 border-border"
      )}>
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-lg",
          color
        )}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={cn("font-gaming text-xl mt-0.5", glowClass)}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

export function StatsPanel({ stats }: StatsPanelProps) {
  const getSessionDuration = () => {
    if (!stats.sessionStartTime) return '00:00:00';
    const diff = Date.now() - stats.sessionStartTime.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        icon={<Swords className="w-6 h-6 text-accent" />}
        label="Ataques"
        value={stats.attacksCompleted}
        color="bg-accent/10 border border-accent/30"
        glowClass="text-accent"
      />
      <StatCard
        icon={<Coins className="w-6 h-6 text-yellow-500" />}
        label="Ouro"
        value={stats.goldCollected}
        color="bg-yellow-500/10 border border-yellow-500/30"
        glowClass="text-yellow-500"
      />
      <StatCard
        icon={<Droplets className="w-6 h-6 text-pink-500" />}
        label="Elixir"
        value={stats.elixirCollected}
        color="bg-pink-500/10 border border-pink-500/30"
        glowClass="text-pink-500"
      />
      <StatCard
        icon={<Moon className="w-6 h-6 text-purple-500" />}
        label="Elixir Negro"
        value={stats.darkElixirCollected}
        color="bg-purple-500/10 border border-purple-500/30"
        glowClass="text-purple-500"
      />
      <StatCard
        icon={<Blocks className="w-6 h-6 text-stone-400" />}
        label="Muros"
        value={stats.wallsUpgraded}
        color="bg-stone-500/10 border border-stone-500/30"
        glowClass="text-stone-400"
      />
      <StatCard
        icon={<Clock className="w-6 h-6 text-primary" />}
        label="Tempo"
        value={getSessionDuration()}
        color="bg-primary/10 border border-primary/30"
        glowClass="text-primary"
      />
    </div>
  );
}
