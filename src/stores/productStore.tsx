import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Product, ProductBatch, ConfectionCategory } from '@/types';
import { productSyncSocket } from '@/services/productSyncSocket';
import {
  fetchProductsFromSupabase,
  upsertProductToSupabase,
  deleteProductFromSupabase,
  insertBatchToSupabase,
  updateBatchRemainingInSupabase,
  generateUUID,
} from '@/services/supabaseData';

export interface RestockParams {
  productId: string;
  supplierId: string;
  supplierName: string;
  batchNumber: string;
  costPrice: number;
  sellingPrice: number;
  expiryDate?: string;
  quantity: number;
}

export interface AddProductInput {
  name: string;
  weight?: string;
  category: ConfectionCategory;
  price?: number;
  costPrice?: number;
  barcode?: string;
  sku?: string;
  brand?: string;
  description?: string;
  lowStockThreshold?: number;
  imageColor?: string;
  imageUrl?: string;
  initialSupplierId?: string;
  initialSupplierName?: string;
  initialCost?: number;
  initialStock?: number;
  batchNumber?: string;
  expiryDate?: string;
  isAvailable?: boolean;
}

export interface StockDeductionItem {
  productId: string;
  quantity: number;
  batchAllocations?: Array<{
    batchId?: string;
    batchNumber?: string;
    supplierId?: string;
    quantity: number;
  }>;
}

interface ProductContextType {
  products: Product[];
  addProduct: (productData: AddProductInput) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  restockProduct: (params: RestockParams) => ProductBatch;
  restockProducts: (paramsList: RestockParams[]) => ProductBatch[];
  deductStock: (deductions: StockDeductionItem[]) => void;
  getProductById: (id: string) => Product | undefined;
  getBatchesForProduct: (productId: string) => ProductBatch[];
}

const INITIAL_PRODUCTS_WITH_BATCHES: Product[] = [];

export const formatBatchDate = (d: Date = new Date()): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const normalizeExpiryDate = (raw?: string): string => {
  if (!raw || raw.trim() === '' || raw.toUpperCase() === 'N/A') return 'N/A';
  const clean = raw.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').trim();
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }
  return raw;
};

export const isBatchExpired = (dateStr?: string): boolean => {
  if (!dateStr || dateStr.trim() === '' || dateStr.toUpperCase() === 'N/A') return false;
  const cleanStr = dateStr.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').trim();
  const exp = new Date(cleanStr);
  if (isNaN(exp.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return exp.getTime() < today.getTime();
};

export interface StockExpiryStatus {
  totalStock: number;
  expiredQty: number;
  validQty: number;
  hasExpired: boolean;
  isAllExpired: boolean;
  isPartialExpired: boolean;
  isOutOfStock: boolean;
  displayText: string;
}

export const getProductStockExpiryStatus = (prod: Product): StockExpiryStatus => {
  const totalStock = typeof prod.stock === 'number' ? Math.max(0, prod.stock) : 0;

  if (totalStock <= 0) {
    return {
      totalStock: 0,
      expiredQty: 0,
      validQty: 0,
      hasExpired: false,
      isAllExpired: false,
      isPartialExpired: false,
      isOutOfStock: true,
      displayText: 'Out of stock',
    };
  }

  let expiredQty = 0;
  if (prod.batches && prod.batches.length > 0) {
    let trackedBatchTotal = 0;
    let expiredBatchTotal = 0;

    for (const b of prod.batches) {
      const bQty = typeof b.quantityRemaining === 'number' ? b.quantityRemaining : 0;
      trackedBatchTotal += bQty;
      if (isBatchExpired(b.expiryDate)) {
        expiredBatchTotal += bQty;
      }
    }

    if (trackedBatchTotal > 0) {
      expiredQty = expiredBatchTotal;
    } else {
      const hasAnyExpiredBatch = prod.batches.some((b) => isBatchExpired(b.expiryDate));
      if (hasAnyExpiredBatch) {
        expiredQty = totalStock;
      }
    }
  } else if (prod.expiryDate && isBatchExpired(prod.expiryDate)) {
    expiredQty = totalStock;
  }

  expiredQty = Math.min(expiredQty, totalStock);
  const validQty = Math.max(0, totalStock - expiredQty);

  if (expiredQty > 0) {
    if (expiredQty >= totalStock) {
      return {
        totalStock,
        expiredQty,
        validQty: 0,
        hasExpired: true,
        isAllExpired: true,
        isPartialExpired: false,
        isOutOfStock: false,
        displayText: `${expiredQty} Expired`,
      };
    } else {
      return {
        totalStock,
        expiredQty,
        validQty,
        hasExpired: true,
        isAllExpired: false,
        isPartialExpired: true,
        isOutOfStock: false,
        displayText: `${expiredQty}/${totalStock} expired`,
      };
    }
  }

  return {
    totalStock,
    expiredQty: 0,
    validQty: totalStock,
    hasExpired: false,
    isAllExpired: false,
    isPartialExpired: false,
    isOutOfStock: false,
    displayText: `${totalStock} in stock`,
  };
};

export const isProductExpired = (prod: Product): boolean => {
  return getProductStockExpiryStatus(prod).hasExpired;
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const STORAGE_KEY = 'chill_choc_products_v1';

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((prod: Product) => {
              const initProd = INITIAL_PRODUCTS_WITH_BATCHES.find((p) => p.id === prod.id);
              if (
                initProd &&
                initProd.batches &&
                (!prod.batches || prod.batches.length < initProd.batches.length)
              ) {
                return initProd;
              }
              if (Array.isArray(prod.batches) && prod.batches.length > 0) {
                const totalBatchStock = prod.batches.reduce(
                  (sum, b) => sum + (typeof b.quantityRemaining === 'number' ? b.quantityRemaining : 0),
                  0
                );
                return {
                  ...prod,
                  stock: totalBatchStock,
                };
              }
              return prod;
            });
          }
        }
      } catch (err) {
        console.error('Failed to load products from storage:', err);
      }
    }
    return INITIAL_PRODUCTS_WITH_BATCHES;
  });

  // Automatically persist products to localStorage on changes
  useEffect(() => {
    if (typeof window !== 'undefined' && products.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      } catch (err) {
        console.error('Failed to persist products:', err);
      }
    }
  }, [products]);

  // Real-time synchronization over WebSocket and BroadcastChannel
  useEffect(() => {
    const unsubscribe = productSyncSocket.subscribe((event) => {
      switch (event.type) {
        case 'PRODUCT_ADDED': {
          setProducts((prev) => {
            if (prev.some((p) => p.id === event.payload.id)) {
              return prev;
            }
            return [event.payload, ...prev];
          });
          break;
        }

        case 'PRODUCT_UPDATED': {
          setProducts((prev) =>
            prev.map((p) => {
              if (p.id !== event.payload.id) return p;
              const updated = { ...p, ...event.payload.updates };
              if (updated.batches) {
                updated.stock = updated.batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
              }
              return updated;
            })
          );
          break;
        }

        case 'PRODUCT_AVAILABILITY_CHANGED': {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === event.payload.id ? { ...p, isAvailable: event.payload.isAvailable } : p
            )
          );
          break;
        }

        case 'PRODUCT_DELETED': {
          setProducts((prev) => prev.filter((p) => p.id !== event.payload.id));
          break;
        }

        case 'PRODUCTS_SYNC_ALL': {
          if (Array.isArray(event.payload) && event.payload.length > 0) {
            setProducts(event.payload);
          }
          break;
        }

        case 'REQUEST_SYNC': {
          setProducts((current) => {
            if (current.length > 0) {
              productSyncSocket.broadcastSyncAll(current);
            }
            return current;
          });
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch initial products from Supabase cloud database
  useEffect(() => {
    let isMounted = true;
    fetchProductsFromSupabase().then((data) => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setProducts(data);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Recalculates product stock dynamically whenever batches update
  const addProduct = (productData: AddProductInput): Product => {
    const newId = generateUUID();
    const initialQty = productData.initialStock || 0;
    const barcode = productData.barcode || `890${Date.now().toString().slice(-9)}`;
    const cleanName = productData.name.trim();
    const cleanWeight = productData.weight?.trim() || '50g';
    const sku =
      productData.sku ||
      `CC-${cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}-${cleanWeight.replace(/[^0-9]/g, '') || '00'}`;

    const batches: ProductBatch[] = [];
    if (initialQty > 0) {
      batches.push({
        id: generateUUID(),
        productId: newId,
        supplierId: productData.initialSupplierId || '',
        supplierName: productData.initialSupplierName || 'Direct Stock',
        batchNumber: productData.batchNumber || `LOT-${Date.now().toString().slice(-4)}`,
        costPrice: productData.initialCost || 0,
        sellingPrice: productData.price || 0,
        receivedDate: formatBatchDate(new Date()),
        expiryDate: normalizeExpiryDate(productData.expiryDate),
        quantityReceived: initialQty,
        quantityRemaining: initialQty,
      });
    }

    const newProduct: Product = {
      id: newId,
      name: cleanName,
      weight: cleanWeight,
      price: productData.price || 0,
      costPrice: productData.costPrice || productData.initialCost || 0,
      category: productData.category,
      barcode,
      sku,
      brand: productData.brand || 'Chill & Choc',
      description: productData.description || '',
      lowStockThreshold: productData.lowStockThreshold || 5,
      imageColor: productData.imageColor || '#27140B',
      imageUrl: productData.imageUrl,
      batches,
      stock: initialQty,
      isAvailable: productData.isAvailable !== undefined ? productData.isAvailable : true,
      supplierId: productData.initialSupplierId,
      supplierName: productData.initialSupplierName,
    };

    setProducts((prev) => [newProduct, ...prev]);
    productSyncSocket.broadcastAdd(newProduct);

    // Sync to Supabase cloud
    upsertProductToSupabase(newProduct);
    batches.forEach((b) => insertBatchToSupabase(b));

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    let changedProd: Product | undefined;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updated.batches) {
          updated.stock = updated.batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
        }
        changedProd = updated;
        return updated;
      })
    );

    if (changedProd) {
      upsertProductToSupabase(changedProd);
    }

    if (updates.isAvailable !== undefined) {
      productSyncSocket.broadcastAvailability(id, updates.isAvailable);
    } else {
      productSyncSocket.broadcastUpdate(id, updates);
    }
  };

  const restockProducts = (paramsList: RestockParams[]): ProductBatch[] => {
    if (!paramsList || paramsList.length === 0) return [];

    const now = new Date();
    const formattedReceived = formatBatchDate(now);

    const newBatches: ProductBatch[] = paramsList.map((item) => {
      const normalizedExp = normalizeExpiryDate(item.expiryDate);
      return {
        id: generateUUID(),
        productId: item.productId,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        batchNumber: item.batchNumber,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        receivedDate: formattedReceived,
        expiryDate: normalizedExp,
        quantityReceived: item.quantity,
        quantityRemaining: item.quantity,
      };
    });

    // Sync new batches to Supabase
    newBatches.forEach((b) => insertBatchToSupabase(b));

    setProducts((prev) => {
      const updatedList = prev.map((p) => {
        const itemBatches = newBatches.filter((b) => b.productId === p.id);
        if (itemBatches.length === 0) return p;

        const latestItem = paramsList.filter((it) => it.productId === p.id).pop();
        const existingBatches = p.batches || [];
        const updatedBatches = [...itemBatches, ...existingBatches];
        const combinedStock = updatedBatches.reduce(
          (sum, b) => sum + (typeof b.quantityRemaining === 'number' ? b.quantityRemaining : 0),
          0
        );

        const updatedProd = {
          ...p,
          price: latestItem && latestItem.sellingPrice > 0 ? latestItem.sellingPrice : p.price,
          costPrice: latestItem && latestItem.costPrice > 0 ? latestItem.costPrice : p.costPrice,
          supplierId: p.supplierId || latestItem?.supplierId,
          supplierName: p.supplierName || latestItem?.supplierName,
          batches: updatedBatches,
          stock: combinedStock,
        };

        // Sync stock to Supabase
        upsertProductToSupabase(updatedProd);

        return updatedProd;
      });

      // Synchronously write to localStorage to prevent data loss on navigation or reload
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      } catch (err) {
        console.error('Failed to persist products to storage:', err);
      }

      productSyncSocket.broadcastSyncAll(updatedList);
      return updatedList;
    });

    return newBatches;
  };

  const restockProduct = (params: RestockParams): ProductBatch => {
    return restockProducts([params])[0];
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    productSyncSocket.broadcastDelete(id);
    deleteProductFromSupabase(id);
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  const getBatchesForProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    return prod?.batches || [];
  };

  const deductStock = (deductions: StockDeductionItem[]) => {
    if (!deductions || deductions.length === 0) return;

    setProducts((prev) => {
      const updatedList = prev.map((product) => {
        const itemDeductions = deductions.filter((d) => d.productId === product.id);
        if (itemDeductions.length === 0) return product;

        const totalQtyToDeduct = itemDeductions.reduce((sum, d) => sum + d.quantity, 0);
        let updatedBatches = [...(product.batches || [])];

        let overflowUnits = 0;
        // 1. First process specific batch allocations (from specific supplier barcode scans)
        itemDeductions.forEach((d) => {
          if (d.batchAllocations && d.batchAllocations.length > 0) {
            d.batchAllocations.forEach((alloc) => {
              const bIdx = updatedBatches.findIndex(
                (b) =>
                  (alloc.batchId && b.id === alloc.batchId) ||
                  (alloc.batchNumber && b.batchNumber.toLowerCase() === alloc.batchNumber.toLowerCase())
              );
              if (bIdx >= 0) {
                const currentRemaining = updatedBatches[bIdx].quantityRemaining ?? 0;
                if (alloc.quantity > currentRemaining) {
                  overflowUnits += alloc.quantity - currentRemaining;
                  updatedBatches[bIdx] = {
                    ...updatedBatches[bIdx],
                    quantityRemaining: 0,
                  };
                } else {
                  updatedBatches[bIdx] = {
                    ...updatedBatches[bIdx],
                    quantityRemaining: currentRemaining - alloc.quantity,
                  };
                }
              }
            });
          }
        });

        // 2. Check for any remaining units that were not explicitly allocated or overflowed (FIFO fallback)
        const totalExplicitlyAllocated = itemDeductions.reduce(
          (sum, d) => sum + (d.batchAllocations?.reduce((aSum, a) => aSum + a.quantity, 0) || 0),
          0
        );
        let remainingToDeductFifo = Math.max(0, totalQtyToDeduct - totalExplicitlyAllocated) + overflowUnits;

        if (remainingToDeductFifo > 0 && updatedBatches.length > 0) {
          updatedBatches = updatedBatches.map((b) => {
            if (remainingToDeductFifo <= 0) return b;
            const currentRem = b.quantityRemaining ?? 0;
            if (currentRem <= 0) return b;
            const deduct = Math.min(currentRem, remainingToDeductFifo);
            remainingToDeductFifo -= deduct;
            return {
              ...b,
              quantityRemaining: currentRem - deduct,
            };
          });
        }

        // 3. Recalculate combined product stock as sum of remaining batch quantities
        const combinedStock =
          updatedBatches.length > 0
            ? updatedBatches.reduce((sum, b) => sum + (b.quantityRemaining ?? 0), 0)
            : Math.max(0, product.stock - totalQtyToDeduct);

        return {
          ...product,
          batches: updatedBatches,
          stock: combinedStock,
        };
      });

      // Synchronously write to localStorage to prevent data loss on navigation or reload
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      } catch (err) {
        console.error('Failed to persist products to storage after stock deduction:', err);
      }

      // Sync updated stocks and batches to Supabase cloud
      deductions.forEach((d) => {
        const prod = updatedList.find((p) => p.id === d.productId);
        if (prod) {
          upsertProductToSupabase(prod);
          prod.batches?.forEach((b) => {
            updateBatchRemainingInSupabase(b.id, b.quantityRemaining);
          });
        }
      });

      productSyncSocket.broadcastSyncAll(updatedList);
      return updatedList;
    });
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        restockProduct,
        restockProducts,
        deductStock,
        getProductById,
        getBatchesForProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
