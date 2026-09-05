import React from 'react';
import { ConfectionCategory } from '@/types';
import {
  Sparkles,
  Candy,
  Cookie,
  CupSoda,
  Gift,
  MoreHorizontal,
  Layers,
} from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: ConfectionCategory;
  onSelectCategory: (category: ConfectionCategory) => void;
  categoryCounts?: Record<ConfectionCategory, number>;
}

interface CategoryOption {
  id: ConfectionCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'chocolate', label: 'Chocolate', icon: Sparkles },
  { id: 'toffees', label: 'Toffees', icon: Candy },
  { id: 'biscuits', label: 'Biscuits', icon: Cookie },
  { id: 'drinks', label: 'Drinks', icon: CupSoda },
  { id: 'gifts', label: 'Gifts', icon: Gift },
  { id: 'others', label: 'Others', icon: MoreHorizontal },
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none no-scrollbar select-none">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const Icon = cat.icon;
        const count = categoryCounts ? categoryCounts[cat.id] : undefined;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
              isSelected
                ? 'bg-black text-white shadow-xs ring-1 ring-black'
                : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FF5500]' : 'text-zinc-500'}`} />
            <span>{cat.label}</span>
            {count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
