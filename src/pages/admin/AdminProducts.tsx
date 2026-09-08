import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useProducts, isProductExpired, isBatchExpired, getProductStockExpiryStatus } from '@/stores/productStore';
import { useSuppliers } from '@/stores/supplierStore';
import { useToast } from '@/stores/toastStore';
import { Product, ProductBatch, ConfectionCategory } from '@/types';
import { BatchListModal } from '@/components/admin/BatchListModal';
import { ProductDetailsModal } from '@/components/admin/ProductDetailsModal';
import { Modal } from '@/components/common/Modal';
import { MonthYearPicker } from '@/components/common/MonthYearPicker';
import {
  Package,
  Search,
  Plus,
  Boxes,
  Layers,
  Building2,
  Tag,
  Barcode,
  CheckCircle2,
  Ban,
  AlertCircle,
  ExternalLink,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Pencil,
  LayoutGrid,
  List,
  PackageX,
  CalendarX,
  // Large Category Icon Pack (33 Confectionery & Retail Icons)
  Candy,
  Cake,
  Cookie,
  IceCream,
  IceCream2,
  Coffee,
  CupSoda,
  Wine,
  Beer,
  Apple,
  Cherry,
  Pizza,
  Sandwich,
  Croissant,
  Popcorn,
  Gift,
  Sparkles,
  Heart,
  Star,
  Crown,
  Flame,
  Zap,
  ShoppingBag,
  Store,
  Smile,
  Award,
  BadgePercent,
  PartyPopper,
  Sun,
} from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
}

export const ICON_PACK: { name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: 'Candy', icon: Candy },
  { name: 'Cookie', icon: Cookie },
  { name: 'Cake', icon: Cake },
  { name: 'IceCream', icon: IceCream },
  { name: 'IceCream2', icon: IceCream2 },
  { name: 'CupSoda', icon: CupSoda },
  { name: 'Coffee', icon: Coffee },
  { name: 'Croissant', icon: Croissant },
  { name: 'Popcorn', icon: Popcorn },
  { name: 'Apple', icon: Apple },
  { name: 'Cherry', icon: Cherry },
  { name: 'Pizza', icon: Pizza },
  { name: 'Sandwich', icon: Sandwich },
  { name: 'Gift', icon: Gift },
  { name: 'PartyPopper', icon: PartyPopper },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Heart', icon: Heart },
  { name: 'Star', icon: Star },
  { name: 'Crown', icon: Crown },
  { name: 'Flame', icon: Flame },
  { name: 'Zap', icon: Zap },
  { name: 'BadgePercent', icon: BadgePercent },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Package', icon: Package },
  { name: 'Boxes', icon: Boxes },
  { name: 'Store', icon: Store },
  { name: 'Tag', icon: Tag },
  { name: 'Wine', icon: Wine },
  { name: 'Beer', icon: Beer },
  { name: 'Smile', icon: Smile },
  { name: 'Award', icon: Award },
  { name: 'Sun', icon: Sun },
  { name: 'Layers', icon: Layers },
];

const ICON_MAP = new Map(ICON_PACK.map((item) => [item.name, item.icon]));

export const CategoryIconComponent: React.FC<{ name?: string; className?: string }> = ({
  name = 'Tag',
  className = 'w-3.5 h-3.5',
}) => {
  const IconComp = ICON_MAP.get(name) || Tag;
  return <IconComp className={className} />;
};

const DEFAULT_CATEGORY_ITEMS: CategoryItem[] = [
  { id: 'all', name: 'All', icon: 'Layers' },
  { id: 'chocolate', name: 'Chocolate', icon: 'Candy' },
  { id: 'toffees', name: 'Toffees', icon: 'Sparkles' },
  { id: 'biscuits', name: 'Biscuits', icon: 'Cookie' },
  { id: 'drinks', name: 'Drinks', icon: 'CupSoda' },
  { id: 'gifts', name: 'Gifts', icon: 'Gift' },
];

const getStoredCategories = (): CategoryItem[] => {
  try {
    const stored = localStorage.getItem('chill_choc_category_items_v2');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // fallback to defaults
  }
  return DEFAULT_CATEGORY_ITEMS;
};

interface ExpiryItem {
  supplier: string;
  expiryDate: string;
  batchNumber?: string;
  quantity?: number;
}

const ExpiryDateSlideshow: React.FC<{ batches?: ProductBatch[] }> = ({ batches }) => {
  const items: ExpiryItem[] = useMemo(() => {
    if (!batches || batches.length === 0) return [];
    return batches
      .filter((b) => Boolean(b.expiryDate))
      .map((b) => ({
        supplier: b.supplierName || 'General Supplier',
        expiryDate: b.expiryDate!,
        batchNumber: b.batchNumber,
        quantity: b.quantityRemaining,
      }));
  }, [batches]);

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.supplier)));
  }, [items]);

  const hasMultipleSuppliers = uniqueSuppliers.length > 1;

  const [currentIndex, setCurrentIndex] = useState(0);

  // Automatically cycle through batches every 2.8s when multiple suppliers exist
  useEffect(() => {
    if (!hasMultipleSuppliers || items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [hasMultipleSuppliers, items.length]);

  if (items.length === 0) {
    return <span className="text-[10px] font-mono text-zinc-300">-</span>;
  }

  // Single supplier: static display
  if (!hasMultipleSuppliers) {
    const single = items[0];
    const shortSupplier = single.supplier.split(' ')[0].replace(/,/g, '');
    const isExpired = isBatchExpired(single.expiryDate);
    return (
      <div className="flex items-center gap-1 font-mono text-[10.5px] text-zinc-700 whitespace-nowrap">
        <span className={`font-semibold ${isExpired ? 'text-rose-600 font-bold' : 'text-zinc-800'}`}>
          {single.expiryDate}
        </span>
        {isExpired ? (
          <span className="text-[7.5px] font-sans font-black px-1 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 uppercase">
            Expired
          </span>
        ) : (
          <span className="text-[8.5px] text-zinc-400 font-sans truncate max-w-[75px]" title={single.supplier}>
            ({shortSupplier})
          </span>
        )}
      </div>
    );
  }

  // Multiple suppliers: Slide show animation!
  const currentItem = items[currentIndex] || items[0];
  const shortSupplier = currentItem.supplier.split(' ')[0].replace(/,/g, '');
  const isCurrentExpired = isBatchExpired(currentItem.expiryDate);

  return (
    <div
      className="flex items-center gap-1 overflow-hidden whitespace-nowrap"
      title={`Multiple suppliers (${uniqueSuppliers.length}):\n` + items.map((i) => `• ${i.supplier}: Exp ${i.expiryDate} (${i.quantity || 0} in stock)`).join('\n')}
    >
      <div
        key={currentIndex}
        className="flex items-center gap-1 animate-in fade-in slide-in-from-bottom-1 duration-300 font-mono text-[10.5px]"
      >
        <span className={`font-semibold ${isCurrentExpired ? 'text-rose-600 font-bold' : 'text-zinc-800'}`}>
          {currentItem.expiryDate}
        </span>
        {isCurrentExpired ? (
          <span className="text-[7.5px] font-sans font-black px-1 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 uppercase">
            Expired
          </span>
        ) : (
          <span
            className="text-[8.5px] font-sans font-medium px-1 py-0.2 rounded bg-orange-50 text-[#FF5500] border border-orange-200/80 truncate max-w-[80px]"
            title={currentItem.supplier}
          >
            {shortSupplier}
          </span>
        )}
      </div>
      <span
        className="text-[7.5px] font-mono text-zinc-400 font-bold bg-zinc-100 px-1 py-0.2 rounded"
        title={`${items.length} batches from ${uniqueSuppliers.length} suppliers`}
      >
        {currentIndex + 1}/{items.length}
      </span>
    </div>
  );
};

export const AdminProducts: React.FC = () => {
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { suppliers } = useSuppliers();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CategoryItem[]>(getStoredCategories);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Candy');
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [specialFilter, setSpecialFilter] = useState<'none' | 'out_of_stock' | 'expired'>('none');
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Out of Stock & Expired Counts
  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= 0).length;
  }, [products]);

  const expiredCount = useMemo(() => {
    return products.filter((p) => isProductExpired(p)).length;
  }, [products]);

  // Ctrl+Click Category Delete Handler
  const handleCategoryClick = (e: React.MouseEvent, cat: CategoryItem) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      if (cat.id === 'all') {
        showToast('The "All" category cannot be deleted', 'info');
        return;
      }
      setCategoryToDelete(cat);
      return;
    }
    setSelectedCategory(cat.id);
    setSpecialFilter('none');
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const catName = categoryToDelete.name;
    const updated = categories.filter((c) => c.id !== categoryToDelete.id);
    setCategories(updated);
    try {
      localStorage.setItem('chill_choc_category_items_v2', JSON.stringify(updated));
    } catch (err) {
      // ignore
    }

    if (selectedCategory === categoryToDelete.id) {
      setSelectedCategory('all');
    }

    showToast(`Category "${catName}" deleted`, 'success');
    setCategoryToDelete(null);
  };

  // Focus category input when category modal opens
  useEffect(() => {
    if (isAddCategoryModalOpen) {
      setTimeout(() => categoryInputRef.current?.focus(), 50);
    }
  }, [isAddCategoryModalOpen]);

  // Quick keyboard shortcut to activate bottom search pill ('/' or Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (
        (e.key === '/' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add Product Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newCategory, setNewCategory] = useState<ConfectionCategory>('chocolate');
  const [newBrand, setNewBrand] = useState('');
  const [newLowStock, setNewLowStock] = useState('5');
  const [newIsAvailable, setNewIsAvailable] = useState(true);
  const [newPhotoData, setNewPhotoData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Product Modal state
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editCategory, setEditCategory] = useState<ConfectionCategory>('chocolate');
  const [editBrand, setEditBrand] = useState('');
  const [editLowStock, setEditLowStock] = useState('5');
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [editPhotoData, setEditPhotoData] = useState('');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Quick toggle availability directly from product card action dock
  const handleToggleAvailability = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    const nextStatus = prod.isAvailable === false ? true : false;
    updateProduct(prod.id, { isAvailable: nextStatus });
    if (nextStatus) {
      showToast(`"${prod.name}" is now Available in store`, 'success');
    } else {
      showToast(`"${prod.name}" marked as Unavailable`, 'info');
    }
  };

  // Delete Product state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleOpenEdit = (prod: Product) => {
    setProductToEdit(prod);
    setEditName(prod.name);
    setEditWeight(prod.weight);
    setEditCategory(prod.category);
    setEditBrand(prod.brand || '');
    setEditLowStock(prod.lowStockThreshold?.toString() || '5');
    setEditIsAvailable(prod.isAvailable !== false);
    setEditPhotoData(prod.imageUrl || '');
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file must be under 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditPhotoData(reader.result as string);
      showToast('Product photo updated', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productToEdit) return;
    if (!editName.trim()) {
      showToast('Please provide a product name', 'error');
      return;
    }

    updateProduct(productToEdit.id, {
      name: editName.trim(),
      weight: editWeight.trim() || '1 pc',
      category: editCategory,
      brand: editBrand.trim() || 'Chill & Choc',
      lowStockThreshold: parseInt(editLowStock) || 5,
      imageUrl: editPhotoData || undefined,
      isAvailable: editIsAvailable,
    });

    showToast(`Updated "${editName}" successfully!`, 'success');
    setProductToEdit(null);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    const name = productToDelete.name;
    deleteProduct(productToDelete.id);
    showToast(`Deleted "${name}" from inventory`, 'success');
    setProductToDelete(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file must be under 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewPhotoData(reader.result as string);
      showToast('Product photo attached', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Add Category Handler with Selected Icon
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast('Please enter a category name', 'error');
      return;
    }
    const slug = trimmed.toLowerCase();
    if (categories.some((c) => c.id.toLowerCase() === slug || c.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Category "${trimmed}" already exists`, 'info');
      setSelectedCategory(slug);
      setIsAddCategoryModalOpen(false);
      setNewCategoryName('');
      return;
    }

    const newCategoryItem: CategoryItem = {
      id: slug,
      name: trimmed,
      icon: selectedIcon || 'Tag',
    };

    const updated = [...categories, newCategoryItem];
    setCategories(updated);
    try {
      localStorage.setItem('chill_choc_category_items_v2', JSON.stringify(updated));
    } catch (err) {
      // ignore
    }

    setSelectedCategory(slug);
    setNewCategory(slug as ConfectionCategory);
    showToast(`Category "${trimmed}" added!`, 'success');
    setIsAddCategoryModalOpen(false);
    setNewCategoryName('');
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Special Filter (Out of Stock / Expired)
      if (specialFilter === 'out_of_stock' && p.stock > 0) return false;
      if (specialFilter === 'expired' && !isProductExpired(p)) return false;

      const matchesCategory = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const cleanSearch = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !cleanSearch ||
        p.name.toLowerCase().includes(cleanSearch) ||
        p.barcode.includes(cleanSearch) ||
        p.sku.toLowerCase().includes(cleanSearch) ||
        (p.brand && p.brand.toLowerCase().includes(cleanSearch));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery, specialFilter]);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Please provide a product name', 'error');
      return;
    }

    const created = addProduct({
      name: newName.trim(),
      weight: newWeight.trim() || '50g',
      category: newCategory,
      brand: newBrand.trim() || 'Chill & Choc',
      imageUrl: newPhotoData || undefined,
      lowStockThreshold: Math.max(1, parseInt(newLowStock) || 5),
      isAvailable: newIsAvailable,
    });

    showToast(`Product "${created.name}" created! Restock it to set pricing & suppliers.`, 'success');
    setIsAddModalOpen(false);

    // Reset Form
    setNewName('');
    setNewWeight('');
    setNewCategory('chocolate');
    setNewBrand('');
    setNewLowStock('5');
    setNewIsAvailable(true);
    setNewPhotoData('');
  };

  return (
    <AdminLayout
      title="Product Catalog &amp; Batches"
      mainClassName={
        viewMode === 'list'
          ? 'flex-1 overflow-hidden p-3 sm:p-4 w-full flex flex-col min-h-0 h-full'
          : undefined
      }
      subHeader={
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-zinc-200 flex items-center justify-between gap-3">
          {/* Category Filter Pills & Add Category Button */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={(e) => handleCategoryClick(e, cat)}
                title={cat.id === 'all' ? 'All products' : `${cat.name} (Hold Ctrl + click to delete)`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer flex items-center gap-1.5 select-none flex-shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#27140B] text-white shadow-2xs'
                    : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                <CategoryIconComponent
                  name={cat.icon}
                  className={`w-3.5 h-3.5 ${selectedCategory === cat.id ? 'text-[#FF5500]' : 'text-zinc-400'}`}
                />
                <span>{cat.name}</span>
              </button>
            ))}

            {/* Add Category Button: Border Color Orange, No Background Color */}
            <button
              type="button"
              onClick={() => {
                setSelectedIcon('Candy');
                setNewCategoryName('');
                setIsAddCategoryModalOpen(true);
              }}
              title="Add New Category"
              className="w-7 h-7 rounded-full bg-white hover:bg-orange-50 active:scale-90 border-2 border-[#FF5500] text-[#FF5500] shadow-2xs flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Total Count Summary & Active Quick Filter Chip */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {specialFilter !== 'none' && (
              <button
                type="button"
                onClick={() => setSpecialFilter('none')}
                className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                  specialFilter === 'out_of_stock'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                }`}
                title="Click to clear filter"
              >
                <span>Filter: {specialFilter === 'out_of_stock' ? 'Out of Stock' : 'Expired'}</span>
                <X className="w-3 h-3 text-zinc-400" />
              </button>
            )}
            <span className="text-[11px] font-mono text-zinc-400 font-medium hidden sm:inline">
              Showing {filteredProducts.length} of {products.length} products
            </span>
          </div>
        </div>
      }
    >
      <div className={`relative ${viewMode === 'grid' ? 'pb-24' : 'flex-1 flex flex-col min-h-0 h-full overflow-hidden'}`}>

        {/* Unified Smooth Products Area (Grid & List View) */}
        <div className={viewMode === 'list' ? 'flex-1 flex flex-col min-h-0 h-full' : undefined}>
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 text-xs">
              No confectionery products match your search or filter.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredProducts.map((prod) => {
                const stockStatus = getProductStockExpiryStatus(prod);
                const isLowStock = !stockStatus.isOutOfStock && !stockStatus.hasExpired && prod.stock <= (prod.lowStockThreshold || 5);
                const isAvailable = prod.isAvailable !== false;

                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProductForDetails(prod)}
                    className={`relative aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md border bg-[#1c120c] flex flex-col justify-between group select-none transition-all cursor-pointer ${
                      isAvailable
                        ? 'border-zinc-200/90 hover:border-[#FF5500]'
                        : 'border-zinc-700/60 opacity-80'
                    }`}
                  >
                    {/* Background Item Image */}
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}

                    {/* Fallback Brand Background (rich dark confectionery) */}
                    <div
                      className="absolute inset-0 flex items-center justify-center -z-10"
                      style={{ backgroundColor: prod.imageColor || '#27140B' }}
                    >
                      <div className="flex flex-col items-center gap-1 opacity-40">
                        <CategoryIconComponent
                          name={categories.find((c) => c.id === prod.category)?.icon || 'Candy'}
                          className="w-10 h-10 text-white"
                        />
                        <span className="text-[11px] font-mono font-bold text-white tracking-wider">
                          {prod.weight}
                        </span>
                      </div>
                    </div>

                    {/* Seamless Dark Shade Overlay (Strictly NO white bottom) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 via-50% to-black/25 pointer-events-none" />

                    {/* Top Floating Badges (Category & Stock) */}
                    <div className="relative z-10 p-2 sm:p-2.5 flex items-center justify-between pointer-events-auto">
                      {/* Category Pill */}
                      <span className="px-2 py-0.5 rounded-full bg-black/80 border border-white/20 text-[10px] font-bold text-white/95 capitalize flex items-center gap-1 shadow-xs">
                        <CategoryIconComponent
                          name={categories.find((c) => c.id === prod.category)?.icon || 'Tag'}
                          className="w-2.5 h-2.5 text-[#FF5500]"
                        />
                        <span className="truncate max-w-[65px] sm:max-w-[85px]">{prod.category}</span>
                      </span>

                      {/* Stock Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight shadow-xs flex items-center gap-1 ${
                          stockStatus.isOutOfStock || stockStatus.isAllExpired
                            ? 'bg-rose-600 text-white'
                            : stockStatus.isPartialExpired
                            ? 'bg-amber-600 text-white'
                            : isLowStock
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        {stockStatus.displayText}
                      </span>
                    </div>

                    {/* Center Overlay when Unavailable */}
                    {!isAvailable && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="px-3 py-1 rounded-full bg-black/85 backdrop-blur-xs border border-rose-500/60 text-rose-200 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl">
                          <Ban className="w-3.5 h-3.5 text-rose-400 stroke-[2.5]" />
                          <span>Unavailable</span>
                        </div>
                      </div>
                    )}

                    {/* Bottom Dark Shade Area (Title, Price & Action Icons) */}
                    <div className="relative z-10 p-2 sm:p-2.5 flex flex-col gap-1 pointer-events-auto">
                      {/* Product Title */}
                      <h3
                        className="text-xs sm:text-sm font-black text-white leading-tight line-clamp-1 group-hover:text-[#FF5500] transition-colors drop-shadow-sm"
                        title={prod.name}
                      >
                        {prod.name}
                      </h3>

                      {/* Weight & Price Row */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300 font-medium drop-shadow-xs">
                          {prod.weight}
                        </span>

                        <div>
                          {prod.price > 0 ? (
                            <span className="text-xs sm:text-sm font-black text-[#FF5500] font-mono tracking-tight drop-shadow-sm">
                              Rs. {prod.price.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-950/90 border border-amber-500/40 px-1.5 py-0.5 rounded-md">
                              Not priced
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cute Action Icons Dock (Edit, Availability, Restock, Delete) */}
                      <div className="pt-1.5 border-t border-white/15 grid grid-cols-4 gap-1 sm:gap-1.5">
                        {/* Edit Icon Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(prod);
                          }}
                          className="h-7 sm:h-7.5 rounded-xl bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-colors active:scale-95 border border-white/25 shadow-xs cursor-pointer"
                          title="Edit product"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Availability Toggle Icon Button (Placed where Barcode button was) */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleAvailability(e, prod)}
                          className={`h-7 sm:h-7.5 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer ${
                            isAvailable
                              ? 'bg-emerald-500/25 hover:bg-emerald-500/45 text-emerald-300 hover:text-emerald-100 border border-emerald-400/40'
                              : 'bg-rose-500/25 hover:bg-rose-500/45 text-rose-300 hover:text-rose-100 border border-rose-400/40'
                          }`}
                          title={isAvailable ? 'Available in store (Click to make Unavailable)' : 'Unavailable (Click to make Available)'}
                          aria-label={isAvailable ? 'Mark product Unavailable' : 'Mark product Available'}
                        >
                          {isAvailable ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Ban className="w-3.5 h-3.5 text-rose-400" />
                          )}
                        </button>

                        {/* Restock Icon Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/restock?productId=${prod.id}`);
                          }}
                          className="h-7 sm:h-7.5 rounded-xl bg-[#FF5500] hover:bg-[#e04b00] text-white flex items-center justify-center transition-colors active:scale-95 shadow-sm hover:shadow-md cursor-pointer"
                          title="Restock product"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        {/* Delete Icon Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(prod);
                          }}
                          className="h-7 sm:h-7.5 rounded-xl bg-rose-600/35 hover:bg-rose-600 text-rose-100 hover:text-white flex items-center justify-center transition-colors active:scale-95 border border-rose-500/40 shadow-xs cursor-pointer"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Perfectly Structured Semantic Table List View (Warm Ivory #FAF7F2 Header, Stone Dividers, Full Height & Width) */
            <div className="flex-1 flex flex-col min-h-0 w-full h-full">
              {/* Top Control Bar Separated From Table: Right-Side Top < Month > Button, No Background */}
              <div className="flex items-center justify-between gap-3 mb-2 px-1 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-700">Product Inventory &amp; Batches</span>
                  <span className="text-[10px] font-mono text-zinc-500 bg-stone-100 px-2 py-0.5 rounded-md font-semibold border border-stone-200/60">
                    {filteredProducts.length} items
                  </span>
                </div>

                {/* Right Side Top: < Month > navigator button */}
                <MonthYearPicker
                  selectedDate={selectedMonth}
                  onChange={(d) => setSelectedMonth(d)}
                />
              </div>

              {/* Table Card (Pure Table) */}
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs flex flex-col flex-1 min-h-0 w-full h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 w-full h-full">
                  <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                  <thead className="sticky top-0 z-10 bg-[#FAF7F2] border-b border-stone-200/70 select-none shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap w-[10%] min-w-[85px]">SKU</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap w-[27%] min-w-[160px]">Product / Confection</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap w-[12%] min-w-[95px]">Category</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap w-[17%] min-w-[140px]">Exp Date</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap w-[12%] min-w-[90px]">Stock</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap w-[11%] min-w-[90px] text-right">Retail Price</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap w-[11%] min-w-[110px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {filteredProducts.map((prod) => {
                      const stockStatus = getProductStockExpiryStatus(prod);
                      const isLowStock = !stockStatus.isOutOfStock && !stockStatus.hasExpired && prod.stock <= (prod.lowStockThreshold || 5);
                      const isAvailable = prod.isAvailable !== false;

                      return (
                        <tr
                          key={prod.id}
                          onClick={() => setSelectedProductForDetails(prod)}
                          className={`hover:bg-stone-50/80 transition-colors select-none cursor-pointer group ${
                            !isAvailable ? 'opacity-65 bg-stone-50/40' : 'bg-white'
                          }`}
                        >
                          {/* 1. SKU (Placed before product name) */}
                          <td className="py-2 px-3.5 whitespace-nowrap text-[10px] font-mono text-zinc-500 font-medium">
                            {prod.sku}
                          </td>

                          {/* 2. Product Name & Unavailable Tag */}
                          <td className="py-2 px-3.5 truncate">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[11.5px] font-semibold text-zinc-900 group-hover:text-[#FF5500] transition-colors truncate">
                                {prod.name}
                              </span>
                              {!isAvailable && (
                                <span className="px-1 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-600 text-[8px] font-bold flex items-center gap-0.5 flex-shrink-0">
                                  <Ban className="w-2.5 h-2.5" />
                                  Unavailable
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Category */}
                          <td className="py-2 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-[10.5px] font-medium text-zinc-600 capitalize">
                              <CategoryIconComponent
                                name={categories.find((c) => c.id === prod.category)?.icon || 'Tag'}
                                className="w-2.5 h-2.5 text-[#FF5500] flex-shrink-0"
                              />
                              <span>{prod.category}</span>
                            </div>
                          </td>

                          {/* 4. Exp Date (With Slideshow when product has multiple suppliers) */}
                          <td className="py-2 px-3.5 whitespace-nowrap">
                            <ExpiryDateSlideshow batches={prod.batches} />
                          </td>

                          {/* 5. Stock (Clean Typography & Status Colors) */}
                          <td className="py-2 px-3.5 whitespace-nowrap">
                            <span
                              className={`font-mono text-[10.5px] font-semibold ${
                                stockStatus.isOutOfStock || stockStatus.isAllExpired
                                  ? 'text-rose-600 font-bold'
                                  : stockStatus.isPartialExpired
                                  ? 'text-amber-600 font-bold'
                                  : isLowStock
                                  ? 'text-amber-600'
                                  : 'text-zinc-700'
                              }`}
                            >
                              {stockStatus.displayText}
                            </span>
                          </td>

                          {/* 6. Retail Price */}
                          <td className="py-2 px-3.5 whitespace-nowrap text-right">
                            {prod.price > 0 ? (
                              <span className="text-[11.5px] font-bold text-[#FF5500] font-mono">
                                Rs. {prod.price.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                Not priced
                              </span>
                            )}
                          </td>

                          {/* 7. Action Icons (Clean, Borderless, Micro-interactions) */}
                          <td className="py-2 px-3.5 whitespace-nowrap text-right">
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(prod)}
                                className="p-1 bg-transparent border-0 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
                                title="Edit product"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>

                              {/* Available / Unavailable Toggle */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleAvailability(e, prod)}
                                className={`p-1 bg-transparent border-0 transition-colors cursor-pointer ${
                                  isAvailable
                                    ? 'text-emerald-500 hover:text-emerald-700'
                                    : 'text-rose-500 hover:text-rose-700'
                                }`}
                                title={isAvailable ? 'Available (Click to make Unavailable)' : 'Unavailable (Click to make Available)'}
                              >
                                {isAvailable ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Ban className="w-3 h-3 text-rose-500" />
                                )}
                              </button>

                              {/* Restock */}
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/restock?productId=${prod.id}`)}
                                className="p-1 bg-transparent border-0 text-[#FF5500] hover:text-[#e04b00] transition-colors cursor-pointer"
                                title="Restock product"
                              >
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setProductToDelete(prod)}
                                className="p-1 bg-transparent border-0 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete product"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Bottom spacer so floating search pill doesn't obscure the last rows */}
                    <tr>
                      <td colSpan={7} className="h-20 border-0 p-0 pointer-events-none" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Center Search Pop-up Pill with + Add Button */}
      <div className="fixed bottom-7 sm:bottom-8 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] z-30 pointer-events-none">
        <div
          className={`pointer-events-auto flex items-center gap-1.5 sm:gap-2 pl-3.5 pr-[2px] sm:pr-[2px] h-11 sm:h-12 rounded-full bg-black/95 transition-all duration-300 ease-in-out will-change-[width] ${
            isSearchFocused || searchQuery.trim().length > 0
              ? 'w-[80vw] sm:w-[350px] shadow-2xl shadow-[#FF5500]/25 border-2 border-[#FF5500] ring-4 ring-[#FF5500]/20'
              : 'w-[215px] sm:w-[240px] shadow-2xl shadow-black/40 border-2 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Search
            className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${
              isSearchFocused || searchQuery.trim().length > 0 ? 'text-[#FF5500]' : 'text-zinc-400'
            }`}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-bold text-[#FF5500] placeholder:text-zinc-500 placeholder:font-medium focus:outline-none caret-[#FF5500]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              title="Clear search"
            >
              <X className="w-3 h-3 text-[#FF5500]" />
            </button>
          )}

          {/* Add New Product Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] aspect-square rounded-full bg-white hover:bg-orange-50 border-2 border-[#FF5500] inline-flex items-center justify-center p-0 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm cursor-pointer flex-shrink-0"
            title="Add New Product"
          >
            <Plus className="w-[18px] h-[18px] text-[#FF5500] stroke-[2.5] block shrink-0" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Right Status Action Badges: Grid/List Toggle, Expired & Out of Stock */}
      <div className="fixed bottom-7 sm:bottom-8 right-4 sm:right-6 z-30 flex items-center gap-2 sm:gap-2.5 pointer-events-auto select-none">
        {/* 1. Grid / List View Mode Changer */}
        <button
          type="button"
          onClick={() => setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'))}
          className="relative w-11 h-11 sm:w-12 sm:h-12 aspect-square rounded-full bg-white hover:bg-orange-50/80 text-[#FF5500] border-2 border-[#FF5500] flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl cursor-pointer group"
          title={
            viewMode === 'grid'
              ? 'Grid view active • Click to switch to List view'
              : 'List view active • Click to switch to Grid view'
          }
          aria-label="Toggle Grid and List View"
        >
          {viewMode === 'grid' ? (
            <LayoutGrid className="w-5 h-5 text-[#FF5500] stroke-[2.2] group-hover:scale-110 transition-transform duration-150 block shrink-0" />
          ) : (
            <List className="w-5 h-5 text-[#FF5500] stroke-[2.2] group-hover:scale-110 transition-transform duration-150 block shrink-0" />
          )}
        </button>

        {/* 2. Expired Filter Button (Only shown if there are expired products or filter active) */}
        {(expiredCount > 0 || specialFilter === 'expired') && (
          <button
            type="button"
            onClick={() => {
              setSpecialFilter((prev) => (prev === 'expired' ? 'none' : 'expired'));
            }}
            className={`relative w-11 h-11 sm:w-12 sm:h-12 aspect-square rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xl active:scale-95 border-2 ${
              specialFilter === 'expired'
                ? 'bg-[#FF5500] text-white border-[#FF5500] ring-4 ring-[#FF5500]/25 scale-105 shadow-orange-500/40'
                : 'bg-white hover:bg-orange-50/80 text-[#FF5500] border-[#FF5500] hover:scale-105'
            }`}
            title={
              specialFilter === 'expired'
                ? 'Active: Filtering Expired Batches • Click to clear'
                : `Expired Batches (${expiredCount}) • Click to filter`
            }
            aria-label="Filter Expired Products"
          >
            <CalendarX className="w-5 h-5 stroke-[2.2]" />
            {expiredCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#FF5500] text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-md animate-in zoom-in-75 duration-150">
                {expiredCount}
              </span>
            )}
          </button>
        )}

        {/* 3. Out of Stock Filter Button (Only shown if there are out of stock products or filter active) */}
        {(outOfStockCount > 0 || specialFilter === 'out_of_stock') && (
          <button
            type="button"
            onClick={() => {
              setSpecialFilter((prev) => (prev === 'out_of_stock' ? 'none' : 'out_of_stock'));
            }}
            className={`relative w-11 h-11 sm:w-12 sm:h-12 aspect-square rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xl active:scale-95 border-2 ${
              specialFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white border-rose-500 ring-4 ring-rose-500/25 scale-105 shadow-rose-600/40'
                : 'bg-white hover:bg-orange-50/80 text-rose-500 border-[#FF5500] hover:scale-105'
            }`}
            title={
              specialFilter === 'out_of_stock'
                ? 'Active: Filtering Out of Stock • Click to clear'
                : `Out of Stock (${outOfStockCount}) • Click to filter`
            }
            aria-label="Filter Out of Stock Products"
          >
            <PackageX className="w-5 h-5 stroke-[2.2]" />
            {outOfStockCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-md animate-in zoom-in-75 duration-150">
                {outOfStockCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Supplier Batches Modal */}
      <BatchListModal
        isOpen={Boolean(selectedProductForBatches)}
        onClose={() => setSelectedProductForBatches(null)}
        product={products.find((p) => p.id === selectedProductForBatches?.id) || selectedProductForBatches}
      />

      {/* Product Details & Suppliers Breakdown Modal */}
      <ProductDetailsModal
        isOpen={Boolean(selectedProductForDetails)}
        onClose={() => setSelectedProductForDetails(null)}
        product={products.find((p) => p.id === selectedProductForDetails?.id) || selectedProductForDetails}
        onEdit={(prod) => {
          setSelectedProductForDetails(null);
          handleOpenEdit(prod);
        }}
      />

      {/* Add New Product Modal (2-Column Split: Photo on left, Details on right) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Product"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Side 1: Photo Upload */}
            <div className="flex flex-col">
              <label className="font-bold text-zinc-700 text-xs mb-1.5 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Photo</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {newPhotoData ? (
                <div className="relative w-full flex-1 min-h-[210px] rounded-2xl bg-zinc-100 overflow-hidden border border-zinc-200 group flex items-center justify-center">
                  <img src={newPhotoData} alt="Product Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white text-zinc-900 text-xs font-bold hover:bg-zinc-100 shadow-sm cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPhotoData('')}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex-1 min-h-[210px] rounded-2xl border-2 border-dashed border-zinc-200 hover:border-[#FF5500] bg-zinc-50/60 hover:bg-orange-50/20 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group p-4"
                >
                  <div className="w-11 h-11 rounded-full bg-white shadow-2xs border border-zinc-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5 text-[#FF5500]" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-zinc-700 group-hover:text-[#FF5500] transition-colors">
                      Upload Photo
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Click or drop image</p>
                  </div>
                </div>
              )}
            </div>

            {/* Side 2: Product Details */}
            <div className="flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                {/* Product Name */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 text-xs">Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Product name"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  />
                </div>

                {/* Category & Weight / Size */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 text-xs">Category *</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as ConfectionCategory)}
                      className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500] bg-white cursor-pointer capitalize"
                    >
                      {categories
                        .filter((c) => c.id !== 'all')
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 text-xs">Size / Weight *</label>
                    <input
                      type="text"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="e.g., 200g"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                    />
                  </div>
                </div>

                {/* Brand & Low Stock Alert */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 text-xs">Brand</label>
                    <input
                      type="text"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="e.g., Nestlé (Optional)"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 text-xs">Low Stock Alert (Units)</label>
                    <input
                      type="number"
                      min="1"
                      value={newLowStock}
                      onChange={(e) => setNewLowStock(e.target.value)}
                      placeholder="5"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                    />
                  </div>
                </div>

                {/* Catalog Status (Available / Unavailable) */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 text-xs">Catalog Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewIsAvailable(true)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        newIsAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                          : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${newIsAvailable ? 'text-emerald-600' : 'text-zinc-400'}`} />
                      <span>Available</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewIsAvailable(false)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        !newIsAvailable
                          ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20 shadow-2xs'
                          : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <Ban className={`w-3.5 h-3.5 ${!newIsAvailable ? 'text-rose-600' : 'text-zinc-400'}`} />
                      <span>Unavailable</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Action (Full Width Orange Button) */}
              <div className="pt-2 border-t border-zinc-100">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#e04b00] active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Add Category Modal with Left-Side Panda Cart Image (No background, No borders) & Right-Side Form */}
      <Modal
        isOpen={isAddCategoryModalOpen}
        onClose={() => {
          setIsAddCategoryModalOpen(false);
          setNewCategoryName('');
        }}
        title="New Category"
        hideHeader={true}
        bodyClassName="p-5 sm:p-7 bg-white"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateCategory} className="text-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left Side: Big Panda Category Illustration (/cat.png) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-2 bg-transparent border-0 select-none">
              <img
                src="/cat.png"
                alt="Chill & Choc Category Panda"
                className="w-full max-w-[240px] md:max-w-[275px] h-auto object-contain pointer-events-none transition-transform hover:scale-105 duration-300 drop-shadow-sm"
                draggable={false}
              />
            </div>

            {/* Right Side: Header with Close, Category Name, Large Icon Pack, and Save Button */}
            <div className="md:col-span-7 space-y-4">
              {/* Header Title & Close Button */}
              <div className="flex items-center justify-between pb-0.5">
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">New Category</h3>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Name Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 text-xs">Category Name *</label>
                <input
                  ref={categoryInputRef}
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Candies, Pastries, Snacks"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500] placeholder:text-zinc-400"
                />
              </div>

              {/* Large Icon Pack Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-700 text-xs">Choose Category Icon</label>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-[11px] font-bold text-[#FF5500]">
                    <CategoryIconComponent name={selectedIcon} className="w-3.5 h-3.5" />
                    <span>{selectedIcon}</span>
                  </div>
                </div>

                {/* Perfectly Circular Icons Grid (No outer border/bg, circle backgrounds only) */}
                <div className="grid grid-cols-7 gap-2 max-h-44 overflow-y-auto p-1">
                  {ICON_PACK.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedIcon(name)}
                      title={name}
                      className={`w-9 h-9 rounded-full aspect-square flex items-center justify-center transition-all cursor-pointer ${
                        selectedIcon === name
                          ? 'bg-[#FF5500] text-white shadow-md scale-110 ring-2 ring-[#FF5500]/30'
                          : 'bg-zinc-100 hover:bg-orange-100 text-zinc-600 hover:text-[#FF5500] hover:scale-105'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Width Orange Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#e04b00] active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Save Category</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Category Confirmation Modal (Triggered by Ctrl + Click) */}
      <Modal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        title="Delete Category"
        hideHeader={true}
        bodyClassName="p-4 sm:p-5 bg-white"
        maxWidth="md"
      >
        <div className="relative">
          {/* Top-Right Close Button */}
          <button
            type="button"
            onClick={() => setCategoryToDelete(null)}
            className="absolute -top-1 -right-1 w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Left Side: Cute Warning Panda (Strictly NO background, NO borders) */}
            <div className="sm:col-span-5 flex items-center justify-center bg-transparent border-0 select-none p-1">
              <img
                src="/warning.png"
                alt="Chill & Choc Warning"
                className="w-full max-w-[130px] sm:max-w-[150px] h-auto object-contain pointer-events-none drop-shadow-xs"
                draggable={false}
              />
            </div>

            {/* Right Side: Simple Perfect Text & Action Buttons */}
            <div className="sm:col-span-7 flex flex-col justify-center space-y-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-900 leading-snug">
                  Delete "{categoryToDelete?.name}"?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Are you sure you want to remove this category?
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1 py-2 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCategory}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      {/* Edit Product Modal (2-Column Split: Photo on left, Details on right) */}
      <Modal
        isOpen={Boolean(productToEdit)}
        onClose={() => setProductToEdit(null)}
        title="Edit Product"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveEditProduct} className="p-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Side 1: Photo Upload */}
            <div className="flex flex-col space-y-2">
              <label className="font-bold text-zinc-700 text-xs flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Photo</span>
              </label>

              <input
                type="file"
                ref={editFileInputRef}
                accept="image/*"
                onChange={handleEditImageUpload}
                className="hidden"
              />

              {editPhotoData ? (
                <div className="relative w-full flex-1 min-h-[210px] rounded-2xl bg-zinc-100 overflow-hidden border border-zinc-200 group flex items-center justify-center">
                  <img src={editPhotoData} alt="Product Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white text-zinc-900 text-xs font-bold hover:bg-zinc-100 shadow-sm cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPhotoData('')}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-full flex-1 min-h-[210px] rounded-2xl border-2 border-dashed border-zinc-200 hover:border-[#FF5500] bg-zinc-50/60 hover:bg-orange-50/20 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group p-4"
                >
                  <div className="w-11 h-11 rounded-full bg-white shadow-2xs border border-zinc-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5 text-[#FF5500]" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-zinc-700 group-hover:text-[#FF5500] transition-colors">
                      Upload Photo
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Click or drop image</p>
                  </div>
                </div>
              )}
            </div>

            {/* Side 2: Product Details */}
            <div className="flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                {/* Product Name */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 text-xs">Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Product name"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  />
                </div>

                {/* Category & Weight */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 text-xs">Category *</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as ConfectionCategory)}
                      className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500] bg-white cursor-pointer capitalize"
                    >
                      {categories
                        .filter((c) => c.id !== 'all')
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 text-xs">Size / Weight *</label>
                    <input
                      type="text"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      placeholder="e.g., 40g, 100ml"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                    />
                  </div>
                </div>

                {/* Brand */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 text-xs">Brand</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    placeholder="e.g., Nestlé (Optional)"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  />
                </div>

                {/* Low Stock Alert */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 text-xs">Low Stock Alert (Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={editLowStock}
                    onChange={(e) => setEditLowStock(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  />
                </div>

                {/* Catalog Status (Available / Unavailable) */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 text-xs">Catalog Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditIsAvailable(true)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        editIsAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                          : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${editIsAvailable ? 'text-emerald-600' : 'text-zinc-400'}`} />
                      <span>Available</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsAvailable(false)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        !editIsAvailable
                          ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20 shadow-2xs'
                          : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <Ban className={`w-3.5 h-3.5 ${!editIsAvailable ? 'text-rose-600' : 'text-zinc-400'}`} />
                      <span>Unavailable</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Action */}
              <div className="pt-2 border-t border-zinc-100">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#e04b00] active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Update Product</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Product Confirmation Modal */}
      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title="Delete Product"
        hideHeader={true}
        bodyClassName="p-4 sm:p-5 bg-white"
        maxWidth="md"
      >
        <div className="relative">
          {/* Top-Right Close Button */}
          <button
            type="button"
            onClick={() => setProductToDelete(null)}
            className="absolute -top-1 -right-1 w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Left Side: Cute Warning Panda (Strictly NO background, NO borders) */}
            <div className="sm:col-span-5 flex items-center justify-center bg-transparent border-0 select-none p-1">
              <img
                src="/warning.png"
                alt="Chill & Choc Warning"
                className="w-full max-w-[130px] sm:max-w-[150px] h-auto object-contain pointer-events-none drop-shadow-xs"
                draggable={false}
              />
            </div>

            {/* Right Side: Simple Product Details & Confirmation */}
            <div className="sm:col-span-7 flex flex-col justify-center space-y-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-900 leading-snug">
                  Delete "{productToDelete?.name}"?
                </h3>
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  {productToDelete?.stock || 0} in stock • Rs. {productToDelete?.price?.toLocaleString('en-LK') || 0}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-2 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProduct}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
