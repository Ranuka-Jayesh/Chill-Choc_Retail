import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  badgeColor?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badgeColor = 'bg-orange-50 text-[#FF5500]',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs hover:border-zinc-300 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-xl sm:text-2xl font-black text-[#27140B] tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-zinc-500 font-medium">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${badgeColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center gap-1.5 text-[11px] font-semibold">
          <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
            {trend.isPositive ? '+' : ''}
            {trend.value}
          </span>
          <span className="text-zinc-400 font-normal">vs yesterday</span>
        </div>
      )}
    </div>
  );
};
