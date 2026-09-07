import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Product, ProductBatch, ConfectionCategory } from '@/types';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { productSyncSocket } from '@/services/productSyncSocket';

interface RestockParams {
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

interface ProductContextType {
  products: Product[];
  addProduct: (productData: AddProductInput) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  restockProduct: (params: RestockParams) => ProductBatch;
  getProductById: (id: string) => Product | undefined;
  getBatchesForProduct: (productId: string) => ProductBatch[];
}

// Prepopulate MOCK_PRODUCTS with realistic multi-supplier batches
const INITIAL_PRODUCTS_WITH_BATCHES: Product[] = MOCK_PRODUCTS.map((prod) => {
  if (prod.id === 'prod-kitkat') {
    const batches: ProductBatch[] = [
      {
        id: 'batch-kit-1',
        productId: prod.id,
        supplierId: 'sup-nestle',
        supplierName: 'Nestlé Lanka PLC',
        batchNumber: 'LOT-NES-401',
        costPrice: 360,
        sellingPrice: 450,
        receivedDate: '01 Aug 2026',
        expiryDate: '20 Aug 2026',
        quantityReceived: 20,
        quantityRemaining: 12,
      },
      {
        id: 'batch-kit-2',
        productId: prod.id,
        supplierId: 'sup-metro',
        supplierName: 'Metro Confectionery Wholesale',
        batchNumber: 'LOT-MET-908',
        costPrice: 375,
        sellingPrice: 450,
        receivedDate: '20 Aug 2026',
        expiryDate: '20 Jan 2027',
        quantityReceived: 15,
        quantityRemaining: 13,
      },
    ];
    return {
      ...prod,
      costPrice: 365,
      batches,
      stock: 25,
    };
  }

  if (prod.id === 'prod-snickers') {
    const batches: ProductBatch[] = [
      {
        id: 'batch-snk-1',
        productId: prod.id,
        supplierId: 'sup-mars',
        supplierName: 'Mars Global Foods Importers',
        batchNumber: 'LOT-MARS-081',
        costPrice: 400,
        sellingPrice: 500,
        receivedDate: '10 Aug 2026',
        expiryDate: '10 Nov 2026',
        quantityReceived: 15,
        quantityRemaining: 12,
      },
      {
        id: 'batch-snk-2',
        productId: prod.id,
        supplierId: 'sup-metro',
        supplierName: 'Metro Confectionery Wholesale',
        batchNumber: 'LOT-MET-994',
        costPrice: 410,
        sellingPrice: 500,
        receivedDate: '25 Aug 2026',
        expiryDate: '05 Feb 2027',
        quantityReceived: 6,
        quantityRemaining: 6,
      },
    ];
    return {
      ...prod,
      costPrice: 405,
      batches,
      stock: batches.reduce((sum, b) => sum + b.quantityRemaining, 0), // 18
    };
  }

  if (prod.id === 'prod-toblerone') {
    const batches: ProductBatch[] = [
      {
        id: 'batch-tob-1',
        productId: prod.id,
        supplierId: 'sup-mondelez',
        supplierName: 'Mondelēz International Distributors',
        batchNumber: 'LOT-MDZ-102',
        costPrice: 950,
        sellingPrice: 1200,
        receivedDate: '15 Aug 2026',
        expiryDate: '15 Mar 2027',
        quantityReceived: 12,
        quantityRemaining: 12,
      },
    ];
    return {
      ...prod,
      costPrice: 950,
      batches,
      stock: 12,
    };
  }

  // Cotton candy with an expired batch for demonstration & filter testing
  if (prod.id === 'prod-cotton-candy') {
    const expiredBatch: ProductBatch = {
      id: `batch-${prod.id}-init`,
      productId: prod.id,
      supplierId: 'sup-metro',
      supplierName: 'Metro Confectionery Wholesale',
      batchNumber: 'LOT-COT-08',
      costPrice: 240,
      sellingPrice: 350,
      receivedDate: '28 Jul 2026',
      expiryDate: '25 Aug 2026',
      quantityReceived: 12,
      quantityRemaining: 12,
    };
    return {
      ...prod,
      costPrice: 240,
      expiryDate: '25 Aug 2026',
      batches: [expiredBatch],
      stock: 12,
    };
  }

  // Default fallback for other products: single batch from a default supplier
  const defaultBatch: ProductBatch = {
    id: `batch-${prod.id}-init`,
    productId: prod.id,
    supplierId: 'sup-metro',
    supplierName: 'Metro Confectionery Wholesale',
    batchNumber: `LOT-${prod.sku.replace('CC-', '')}-01`,
    costPrice: Math.round(prod.price * 0.78),
    sellingPrice: prod.price,
    receivedDate: '12 Aug 2026',
    expiryDate: '28 Feb 2027',
    quantityReceived: prod.stock,
    quantityRemaining: prod.stock,
  };

  return {
    ...prod,
    costPrice: defaultBatch.costPrice,
    batches: [defaultBatch],
    stock: prod.stock,
  };
});

export const isBatchExpired = (dateStr?: string): boolean => {
  if (!dateStr || dateStr.trim() === '' || dateStr.toUpperCase() === 'N/A') return false;
  const exp = new Date(dateStr);
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
            const kitkat = parsed.find((p: Product) => p.id === 'prod-kitkat' || p.sku === 'CC-KIT-040');
            if (kitkat && kitkat.batches && kitkat.batches.length >= 2) {
              kitkat.batches[0].expiryDate = '20 Aug 2026';
              kitkat.batches[0].quantityRemaining = 12;
              kitkat.batches[1].expiryDate = '20 Jan 2027';
              kitkat.batches[1].quantityRemaining = 13;
              kitkat.stock = 25;
            }
            const cotton = parsed.find((p: Product) => p.id === 'prod-cotton-candy' || p.sku === 'CC-COT-050');
            if (cotton && cotton.batches && cotton.batches[0]) {
              cotton.batches[0].expiryDate = '25 Aug 2026';
              cotton.batches[0].quantityRemaining = 12;
              cotton.expiryDate = '25 Aug 2026';
              cotton.stock = 12;
            }
            return parsed;
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

  // Recalculates product stock dynamically whenever batches update
  const addProduct = (productData: AddProductInput): Product => {
    const newId = `prod-${Date.now().toString().slice(-6)}`;
    const initialQty = productData.initialStock || 0;
    const barcode = productData.barcode || `890${Date.now().toString().slice(-9)}`;
    const cleanName = productData.name.trim();
    const cleanWeight = productData.weight?.trim() || '50g';
    const sku =
      productData.sku ||
      `CC-${cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}-${cleanWeight.replace(/[^0-9]/g, '') || '00'}`;

    const batches: ProductBatch[] = [];
    if (initialQty > 0 && productData.initialSupplierId) {
      batches.push({
        id: `batch-${Date.now()}-1`,
        productId: newId,
        supplierId: productData.initialSupplierId,
        supplierName: productData.initialSupplierName || 'Supplier',
        batchNumber: productData.batchNumber || `LOT-${Date.now().toString().slice(-4)}`,
        costPrice: productData.initialCost || 0,
        sellingPrice: productData.price || 0,
        receivedDate: 'Today',
        expiryDate: productData.expiryDate || 'N/A',
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
    };

    setProducts((prev) => [newProduct, ...prev]);
    productSyncSocket.broadcastAdd(newProduct);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updated.batches) {
          updated.stock = updated.batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
        }
        return updated;
      })
    );

    if (updates.isAvailable !== undefined) {
      productSyncSocket.broadcastAvailability(id, updates.isAvailable);
    } else {
      productSyncSocket.broadcastUpdate(id, updates);
    }
  };

  const restockProduct = ({
    productId,
    supplierId,
    supplierName,
    batchNumber,
    costPrice,
    sellingPrice,
    expiryDate,
    quantity,
  }: RestockParams): ProductBatch => {
    const newBatch: ProductBatch = {
      id: `batch-${Date.now()}`,
      productId,
      supplierId,
      supplierName,
      batchNumber,
      costPrice,
      sellingPrice,
      receivedDate: 'Today',
      expiryDate,
      quantityReceived: quantity,
      quantityRemaining: quantity,
    };

    setProducts((prev) => {
      const updatedList = prev.map((p) => {
        if (p.id !== productId) return p;
        const existingBatches = p.batches || [];
        const updatedBatches = [newBatch, ...existingBatches];
        const combinedStock = updatedBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);

        return {
          ...p,
          price: sellingPrice > 0 ? sellingPrice : p.price,
          costPrice,
          batches: updatedBatches,
          stock: combinedStock,
        };
      });

      productSyncSocket.broadcastSyncAll(updatedList);
      return updatedList;
    });

    return newBatch;
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    productSyncSocket.broadcastDelete(id);
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  const getBatchesForProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    return prod?.batches || [];
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        restockProduct,
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
