import React, { useMemo } from 'react';
import { ConfectionCategory } from '@/types';
import { Layers, Tag } from 'lucide-react';
import { useProducts } from '@/stores/productStore';

interface CategoryFilterProps {
  selectedCategory: ConfectionCategory;
  onSelectCategory: (category: ConfectionCategory) => void;
  categoryCounts?: Record<ConfectionCategory, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  const { products } = useProducts();

  // Dynamically compute categories from configured categories & active products
  const categories = useMemo(() => {
    const list: Array<{ id: ConfectionCategory; label: string }> = [
      { id: 'all', label: 'All Items' },
    ];

    try {
      const saved = localStorage.getItem('chill_choc_category_items_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((c: any) => {
            if (c.id !== 'all' && !list.some((item) => item.id.toLowerCase() === c.id.toLowerCase())) {
              list.push({ id: c.id, label: c.name || c.id });
            }
          });
        }
      }
    } catch {}

    // Also include any categories from existing products
    products.forEach((p) => {
      if (p.category && p.category !== 'all') {
        const catId = p.category.toLowerCase() as ConfectionCategory;
        if (!list.some((item) => item.id.toLowerCase() === catId)) {
          list.push({
            id: catId,
            label: p.category.charAt(0).toUpperCase() + p.category.slice(1),
          });
        }
      }
    });

    return list;
  }, [products]);

  // If only "All Items" exists and there are no products, render minimal indicator
  if (categories.length <= 1 && products.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none no-scrollbar select-none">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const count = categoryCounts ? categoryCounts[cat.id] : undefined;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 flex-shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-black text-white shadow-xs ring-1 ring-black'
                : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400'
            }`}
          >
            {cat.id === 'all' ? (
              <Layers className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FF5500]' : 'text-zinc-500'}`} />
            ) : (
              <Tag className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FF5500]' : 'text-zinc-500'}`} />
            )}
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
