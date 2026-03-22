import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10'
}: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-2xl font-semibold">{value}</span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}