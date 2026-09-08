import React, { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Product, CartItem, Salesperson, Customer, BillDiscount, BatchAllocation } from '@/types';
import { useToast } from './toastStore';
import { StockOverData } from '@/components/modals/SupplierStockOverModal';

interface CartContextType {
  items: CartItem[];
  customer: Customer;
  billDiscount: BillDiscount | null;
  taxRate: number;
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  itemsCount: number;
  selectedItemId: string | null;
  lastAddedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  selectNextItem: () => void;
  selectPreviousItem: () => void;
  incrementSelectedItem: () => void;
  decrementSelectedItem: () => void;
  addItem: (
    product: Product,
    quantity?: number,
    salesperson?: Salesperson | null,
    scannedBatchNumber?: string | null,
    targetSupplierId?: string | null
  ) => boolean;
  updateQuantity: (itemId: string, quantity: number) => void;
  incrementLastItem: () => void;
  decrementLastItem: () => void;
  updateSalesperson: (itemId: string, salesperson: Salesperson | null) => void;
  updateItemDiscount: (itemId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  updateItemNote: (itemId: string, note: string) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer) => void;
  setBillDiscount: (discount: BillDiscount | null) => void;
  loadCart: (items: CartItem[], customer?: Customer) => void;
  itemPendingRemoval: CartItem | null;
  setItemPendingRemoval: (item: CartItem | null) => void;
  defaultSalesperson: Salesperson | null;
  setDefaultSalesperson: (sp: Salesperson | null) => void;
  assignSalesperson: (sp: Salesperson | null, itemId?: string | null) => void;
  showClearConfirm: boolean;
  setShowClearConfirm: (show: boolean) => void;
  stockOverData: StockOverData | null;
  setStockOverData: (data: StockOverData | null) => void;
}

const DEFAULT_CUSTOMER: Customer = {
  id: 'cust-walkin',
  name: 'Walk-in Customer',
  phone: '',
  isWalkIn: true,
};

// Helper to allocate units to supplier batches
function allocateToBatches(
  product: Product,
  currentAllocations: BatchAllocation[] = [],
  quantityToAdd: number,
  targetBatchNumber?: string | null,
  targetSupplierId?: string | null
): BatchAllocation[] {
  const result: BatchAllocation[] = currentAllocations.map((a) => ({ ...a }));
  const batches = product.batches || [];

  // 1. Target specific batch number
  if (targetBatchNumber && batches.length > 0) {
    const matchedBatch = batches.find(
      (b) => b.batchNumber.toLowerCase() === targetBatchNumber.toLowerCase()
    );
    if (matchedBatch) {
      const existingAlloc = result.find(
        (a) =>
          (a.batchId && a.batchId === matchedBatch.id) ||
          a.batchNumber.toLowerCase() === matchedBatch.batchNumber.toLowerCase()
      );

      if (existingAlloc) {
        existingAlloc.quantity += quantityToAdd;
      } else {
        result.push({
          batchId: matchedBatch.id,
          batchNumber: matchedBatch.batchNumber,
          supplierId: matchedBatch.supplierId,
          supplierName: matchedBatch.supplierName,
          quantity: quantityToAdd,
          costPrice: matchedBatch.costPrice,
          expiryDate: matchedBatch.expiryDate,
        });
      }
      return result;
    }
  }

  // 2. Target specific supplier
  if (targetSupplierId && batches.length > 0) {
    const supplierBatches = batches.filter(
      (b) =>
        b.supplierId === targetSupplierId ||
        b.supplierName.toLowerCase() === targetSupplierId.toLowerCase()
    );

    if (supplierBatches.length > 0) {
      let remainingToAdd = quantityToAdd;
      for (const b of supplierBatches) {
        if (remainingToAdd <= 0) break;
        const existingAlloc = result.find(
          (a) =>
            (a.batchId && a.batchId === b.id) ||
            a.batchNumber.toLowerCase() === b.batchNumber.toLowerCase()
        );
        const allocatedFromThisBatch = existingAlloc ? existingAlloc.quantity : 0;
        const batchCapacity = b.quantityRemaining ?? 0;
        const available = Math.max(0, batchCapacity - allocatedFromThisBatch);

        if (available > 0) {
          const take = Math.min(available, remainingToAdd);
          if (existingAlloc) {
            existingAlloc.quantity += take;
          } else {
            result.push({
              batchId: b.id,
              batchNumber: b.batchNumber,
              supplierId: b.supplierId,
              supplierName: b.supplierName,
              quantity: take,
              costPrice: b.costPrice,
              expiryDate: b.expiryDate,
            });
          }
          remainingToAdd -= take;
        }
      }

      if (remainingToAdd > 0) {
        const firstSupBatch = supplierBatches[0];
        const existingAlloc = result.find(
          (a) =>
            (a.batchId && a.batchId === firstSupBatch.id) ||
            a.batchNumber.toLowerCase() === firstSupBatch.batchNumber.toLowerCase()
        );
        if (existingAlloc) {
          existingAlloc.quantity += remainingToAdd;
        } else {
          result.push({
            batchId: firstSupBatch.id,
            batchNumber: firstSupBatch.batchNumber,
            supplierId: firstSupBatch.supplierId,
            supplierName: firstSupBatch.supplierName,
            quantity: remainingToAdd,
            costPrice: firstSupBatch.costPrice,
            expiryDate: firstSupBatch.expiryDate,
          });
        }
      }
      return result;
    }
  }

  // Fallback FIFO allocation across available batches
  let remainingToAdd = quantityToAdd;
  for (const b of batches) {
    if (remainingToAdd <= 0) break;
    const existingAlloc = result.find(
      (a) =>
        (a.batchId && a.batchId === b.id) ||
        a.batchNumber.toLowerCase() === b.batchNumber.toLowerCase()
    );
    const allocatedFromThisBatch = existingAlloc ? existingAlloc.quantity : 0;
    const batchCapacity = b.quantityRemaining ?? 0;
    const available = Math.max(0, batchCapacity - allocatedFromThisBatch);

    if (available > 0) {
      const take = Math.min(available, remainingToAdd);
      if (existingAlloc) {
        existingAlloc.quantity += take;
      } else {
        result.push({
          batchId: b.id,
          batchNumber: b.batchNumber,
          supplierId: b.supplierId,
          supplierName: b.supplierName,
          quantity: take,
          costPrice: b.costPrice,
          expiryDate: b.expiryDate,
        });
      }
      remainingToAdd -= take;
    }
  }

  // If there are still remaining units or no batches with stock, append to first batch or fallback
  if (remainingToAdd > 0 && batches.length > 0) {
    const firstBatch = batches[0];
    const existingAlloc = result.find(
      (a) =>
        (a.batchId && a.batchId === firstBatch.id) ||
        a.batchNumber.toLowerCase() === firstBatch.batchNumber.toLowerCase()
    );
    if (existingAlloc) {
      existingAlloc.quantity += remainingToAdd;
    } else {
      result.push({
        batchId: firstBatch.id,
        batchNumber: firstBatch.batchNumber,
        supplierId: firstBatch.supplierId,
        supplierName: firstBatch.supplierName,
        quantity: remainingToAdd,
        costPrice: firstBatch.costPrice,
        expiryDate: firstBatch.expiryDate,
      });
    }
  }

  return result;
}

function reduceFromBatches(
  currentAllocations: BatchAllocation[] = [],
  quantityToReduce: number
): BatchAllocation[] {
  const result: BatchAllocation[] = currentAllocations.map((a) => ({ ...a }));
  let toRemove = quantityToReduce;

  // Reduce from the last added allocation backwards (LIFO)
  for (let i = result.length - 1; i >= 0 && toRemove > 0; i--) {
    if (result[i].quantity <= toRemove) {
      toRemove -= result[i].quantity;
      result[i].quantity = 0;
    } else {
      result[i].quantity -= toRemove;
      toRemove = 0;
    }
  }

  return result.filter((a) => a.quantity > 0);
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>(DEFAULT_CUSTOMER);
  const [billDiscount, setBillDiscount] = useState<BillDiscount | null>(null);
  const [taxRate] = useState<number>(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemPendingRemoval, setItemPendingRemoval] = useState<CartItem | null>(null);
  const [defaultSalesperson, setDefaultSalesperson] = useState<Salesperson | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [stockOverData, setStockOverData] = useState<StockOverData | null>(null);
  const selectedItemIdRef = useRef<string | null>(null);
  const itemsRef = useRef<CartItem[]>(items);

  // Keep references in sync with latest state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    selectedItemIdRef.current = selectedItemId;
  }, [selectedItemId]);

  const { showToast } = useToast();

  const addItem = useCallback(
    (
      product: Product,
      quantity = 1,
      salesperson: Salesperson | null = null,
      scannedBatchNumber?: string | null,
      targetSupplierId?: string | null
    ): boolean => {
      if (product.isAvailable === false) {
        showToast(`${product.name} is currently Unavailable`, 'warning');
        return false;
      }

      if (product.stock <= 0) {
        showToast(`${product.name} is Out of Stock`, 'error');
        return false;
      }

      const existingItem = items.find((item) => item.product.id === product.id);

      // If specific batch number is targeted, check if that batch's stock is exceeded
      if (scannedBatchNumber && product.batches && product.batches.length > 0) {
        const matchedBatch = product.batches.find(
          (b) => b.batchNumber.toLowerCase() === scannedBatchNumber.toLowerCase()
        );
        if (matchedBatch) {
          const existingAllocations = existingItem?.batchAllocations || [];
          const alreadyAllocated = existingAllocations
            .filter(
              (a) =>
                (a.batchId && a.batchId === matchedBatch.id) ||
                a.batchNumber.toLowerCase() === matchedBatch.batchNumber.toLowerCase()
            )
            .reduce((sum, a) => sum + a.quantity, 0);

          if (alreadyAllocated + quantity > (matchedBatch.quantityRemaining ?? 0)) {
            const otherBatches = product.batches
              .filter(
                (b) =>
                  b.supplierId === matchedBatch.supplierId &&
                  b.id !== matchedBatch.id
              )
              .map((b) => {
                const inCart = existingAllocations
                  .filter(
                    (a) =>
                      (a.batchId && a.batchId === b.id) ||
                      a.batchNumber.toLowerCase() === b.batchNumber.toLowerCase()
                  )
                  .reduce((s, a) => s + a.quantity, 0);
                const avail = Math.max(0, (b.quantityRemaining ?? 0) - inCart);
                return { ...b, inCartQty: inCart, stock: avail, isStockOver: avail <= 0 };
              })
              .filter((b) => b.stock > 0);

            const supplierMap = new Map<string, any>();
            for (const b of product.batches) {
              if (b.supplierId === matchedBatch.supplierId) continue;
              const inCart = existingAllocations
                .filter((a) => a.supplierId === b.supplierId)
                .reduce((s, a) => s + a.quantity, 0);
              const avail = Math.max(0, (b.quantityRemaining ?? 0) - inCart);
              if (avail > 0) {
                if (supplierMap.has(b.supplierId)) {
                  supplierMap.get(b.supplierId).stock += avail;
                } else {
                  supplierMap.set(b.supplierId, {
                    supplierId: b.supplierId,
                    supplierName: b.supplierName,
                    stock: avail,
                    totalStock: b.quantityRemaining ?? 0,
                    isStockOver: false,
                    batchCount: 1,
                    inCartQty: inCart,
                  });
                }
              }
            }

            setStockOverData({
              product,
              exceededSupplier: {
                supplierId: matchedBatch.supplierId,
                supplierName: matchedBatch.supplierName,
                totalStock: matchedBatch.quantityRemaining ?? 0,
                inCartQty: alreadyAllocated,
                stock: 0,
                isStockOver: true,
                batchCount: 1,
              },
              exceededBatch: matchedBatch,
              availableBatches: otherBatches,
              availableSuppliers: Array.from(supplierMap.values()),
            });
            return false;
          }
        }
      }

      // If target supplier is specified, check if that supplier's stock is exceeded
      if (targetSupplierId && product.batches && product.batches.length > 0) {
        const supplierBatches = product.batches.filter(
          (b) =>
            b.supplierId === targetSupplierId ||
            b.supplierName.toLowerCase() === targetSupplierId.toLowerCase()
        );
        const supplierTotalStock = supplierBatches.reduce(
          (sum, b) => sum + (b.quantityRemaining ?? 0),
          0
        );
        const existingAllocations = existingItem?.batchAllocations || [];
        const alreadyAllocated = existingAllocations
          .filter(
            (a) =>
              a.supplierId === targetSupplierId ||
              a.supplierName.toLowerCase() === targetSupplierId.toLowerCase()
          )
          .reduce((sum, a) => sum + a.quantity, 0);

        if (alreadyAllocated + quantity > supplierTotalStock) {
          const supplierMap = new Map<string, any>();
          for (const b of product.batches) {
            if (b.supplierId === targetSupplierId || b.supplierName.toLowerCase() === targetSupplierId.toLowerCase()) {
              continue;
            }
            const inCart = existingAllocations
              .filter((a) => a.supplierId === b.supplierId)
              .reduce((s, a) => s + a.quantity, 0);
            const avail = Math.max(0, (b.quantityRemaining ?? 0) - inCart);
            if (avail > 0) {
              if (supplierMap.has(b.supplierId)) {
                supplierMap.get(b.supplierId).stock += avail;
              } else {
                supplierMap.set(b.supplierId, {
                  supplierId: b.supplierId,
                  supplierName: b.supplierName,
                  stock: avail,
                  totalStock: b.quantityRemaining ?? 0,
                  isStockOver: false,
                  batchCount: 1,
                  inCartQty: inCart,
                });
              }
            }
          }

          setStockOverData({
            product,
            exceededSupplier: {
              supplierId: targetSupplierId,
              supplierName: supplierBatches[0]?.supplierName || 'Selected Supplier',
              totalStock: supplierTotalStock,
              inCartQty: alreadyAllocated,
              stock: 0,
              isStockOver: true,
              batchCount: supplierBatches.length,
            },
            exceededBatch: null,
            availableBatches: [],
            availableSuppliers: Array.from(supplierMap.values()),
          });
          return false;
        }
      }

      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > product.stock) {
          showToast(`Cannot add more. Only ${product.stock} units total in stock.`, 'warning');
          return false;
        }

        const newAllocations = allocateToBatches(
          product,
          existingItem.batchAllocations || [],
          quantity,
          scannedBatchNumber,
          targetSupplierId
        );

        selectedItemIdRef.current = existingItem.id;
        setSelectedItemId(existingItem.id);
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: newQty, batchAllocations: newAllocations }
              : item
          )
        );
        setTimeout(() => {
          const el = document.getElementById(`cart-item-row-${existingItem.id}`);
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 10);
        return true;
      } else {
        if (quantity > product.stock) {
          showToast(`Cannot add more. Only ${product.stock} units total in stock.`, 'warning');
          return false;
        }

        const newAllocations = allocateToBatches(
          product,
          [],
          quantity,
          scannedBatchNumber,
          targetSupplierId
        );

        const effectiveSalesperson = salesperson || defaultSalesperson;
        const newItem: CartItem = {
          id: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          product,
          quantity,
          unitPrice: product.price,
          salesperson: effectiveSalesperson,
          discount: null,
          batchAllocations: newAllocations,
        };
        selectedItemIdRef.current = newItem.id;
        setSelectedItemId(newItem.id);
        setItems((prevItems) => [...prevItems, newItem]);
        setTimeout(() => {
          const el = document.getElementById(`cart-item-row-${newItem.id}`);
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 10);
        return true;
      }
    },
    [items, defaultSalesperson, showToast]
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        const target = itemsRef.current.find((item) => item.id === itemId);
        if (target) {
          setItemPendingRemoval(target);
        }
        return;
      }

      const target = items.find((item) => item.id === itemId);
      if (target && quantity > target.product.stock) {
        showToast(`Max available stock is ${target.product.stock}`, 'warning');
        return;
      }

      // Check if increasing quantity exceeds the capacity of the current batch
      if (target && quantity > target.quantity) {
        const added = quantity - target.quantity;
        const allocs = target.batchAllocations || [];
        const lastAlloc = allocs[allocs.length - 1];

        if (lastAlloc && target.product.batches && target.product.batches.length > 0) {
          const matchedBatch = target.product.batches.find(
            (b) =>
              (lastAlloc.batchId && b.id === lastAlloc.batchId) ||
              b.batchNumber.toLowerCase() === lastAlloc.batchNumber.toLowerCase()
          );

          if (matchedBatch) {
            const allocatedToThisBatch = allocs
              .filter(
                (a) =>
                  (a.batchId && a.batchId === matchedBatch.id) ||
                  a.batchNumber.toLowerCase() === matchedBatch.batchNumber.toLowerCase()
              )
              .reduce((sum, a) => sum + a.quantity, 0);

            const batchLimit = matchedBatch.quantityRemaining ?? 0;
            if (allocatedToThisBatch + added > batchLimit) {
              const otherBatches = target.product.batches
                .filter(
                  (b) =>
                    b.supplierId === matchedBatch.supplierId &&
                    b.id !== matchedBatch.id
                )
                .map((b) => {
                  const inCart = allocs
                    .filter(
                      (a) =>
                        (a.batchId && a.batchId === b.id) ||
                        a.batchNumber.toLowerCase() === b.batchNumber.toLowerCase()
                    )
                    .reduce((sum, a) => sum + a.quantity, 0);
                  const avail = Math.max(0, (b.quantityRemaining ?? 0) - inCart);
                  return { ...b, inCartQty: inCart, stock: avail, isStockOver: avail <= 0 };
                })
                .filter((b) => b.stock > 0);

              const supplierMap = new Map<string, any>();
              for (const b of target.product.batches) {
                if (b.supplierId === matchedBatch.supplierId) continue;
                const inCart = allocs
                  .filter((a) => a.supplierId === b.supplierId)
                  .reduce((sum, a) => sum + a.quantity, 0);
                const avail = Math.max(0, (b.quantityRemaining ?? 0) - inCart);
                if (avail > 0) {
                  if (supplierMap.has(b.supplierId)) {
                    supplierMap.get(b.supplierId).stock += avail;
                  } else {
                    supplierMap.set(b.supplierId, {
                      supplierId: b.supplierId,
                      supplierName: b.supplierName,
                      stock: avail,
                      totalStock: b.quantityRemaining ?? 0,
                      isStockOver: false,
                      batchCount: 1,
                      inCartQty: inCart,
                    });
                  }
                }
              }

              const otherSuppliers = Array.from(supplierMap.values());

              if (otherBatches.length > 0 || otherSuppliers.length > 0) {
                setStockOverData({
                  product: target.product,
                  exceededSupplier: {
                    supplierId: matchedBatch.supplierId,
                    supplierName: matchedBatch.supplierName,
                    totalStock: batchLimit,
                    inCartQty: allocatedToThisBatch,
                    stock: 0,
                    isStockOver: true,
                    batchCount: 1,
                  },
                  exceededBatch: matchedBatch,
                  availableBatches: otherBatches,
                  availableSuppliers: otherSuppliers,
                });
                return;
              }
            }
          }
        }
      }

      selectedItemIdRef.current = itemId;
      setSelectedItemId(itemId);
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;

          let newAllocations = item.batchAllocations || [];
          if (quantity > item.quantity) {
            const added = quantity - item.quantity;
            newAllocations = allocateToBatches(item.product, newAllocations, added, null);
          } else if (quantity < item.quantity) {
            const removed = item.quantity - quantity;
            newAllocations = reduceFromBatches(newAllocations, removed);
          }

          return { ...item, quantity, batchAllocations: newAllocations };
        })
      );
    },
    [items, showToast]
  );

  const selectNextItem = useCallback(() => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;

    const currentSelectedId = selectedItemIdRef.current;
    const currentIndex = currentItems.findIndex((i) => i.id === currentSelectedId);

    let nextIndex = 0;
    if (currentIndex === -1) {
      nextIndex = 0;
    } else {
      nextIndex = Math.min(currentItems.length - 1, currentIndex + 1);
    }

    const nextItem = currentItems[nextIndex];
    if (nextItem) {
      selectedItemIdRef.current = nextItem.id;
      setSelectedItemId(nextItem.id);
      setTimeout(() => {
        const el = document.getElementById(`cart-item-row-${nextItem.id}`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 10);
    }
  }, []);

  const selectPreviousItem = useCallback(() => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;

    const currentSelectedId = selectedItemIdRef.current;
    const currentIndex = currentItems.findIndex((i) => i.id === currentSelectedId);

    let prevIndex = 0;
    if (currentIndex === -1) {
      prevIndex = currentItems.length - 1;
    } else {
      prevIndex = Math.max(0, currentIndex - 1);
    }

    const prevItem = currentItems[prevIndex];
    if (prevItem) {
      selectedItemIdRef.current = prevItem.id;
      setSelectedItemId(prevItem.id);
      setTimeout(() => {
        const el = document.getElementById(`cart-item-row-${prevItem.id}`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 10);
    }
  }, []);

  const incrementSelectedItem = useCallback(() => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;
    const currentId = selectedItemIdRef.current;
    const targetId =
      currentId && currentItems.some((i) => i.id === currentId)
        ? currentId
        : currentItems[currentItems.length - 1].id;

    const target = currentItems.find((i) => i.id === targetId);
    if (!target) return;
    if (target.quantity >= target.product.stock) {
      showToast(`Max available stock is ${target.product.stock}`, 'warning');
      return;
    }
    updateQuantity(targetId, target.quantity + 1);
  }, [updateQuantity, showToast]);

  const decrementSelectedItem = useCallback(() => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;
    const currentId = selectedItemIdRef.current;
    const targetId =
      currentId && currentItems.some((i) => i.id === currentId)
        ? currentId
        : currentItems[currentItems.length - 1].id;

    const targetIndex = currentItems.findIndex((i) => i.id === targetId);
    const target = currentItems[targetIndex];
    if (!target) return;

    if (target.quantity <= 1) {
      setItemPendingRemoval(target);
      return;
    }

    updateQuantity(targetId, target.quantity - 1);
  }, [updateQuantity]);

  const updateSalesperson = useCallback((itemId: string, salesperson: Salesperson | null) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, salesperson } : item))
    );
  }, []);

  const assignSalesperson = useCallback((sp: Salesperson | null, targetItemId?: string | null) => {
    setDefaultSalesperson(sp);
    if (targetItemId) {
      setItems((prev) =>
        prev.map((item) => (item.id === targetItemId ? { ...item, salesperson: sp } : item))
      );
    } else {
      setItems((prev) =>
        prev.map((item) => ({ ...item, salesperson: sp }))
      );
    }
  }, []);

  const updateItemDiscount = useCallback((itemId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, discount } : item))
    );
  }, []);

  const updateItemNote = useCallback((itemId: string, note: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, note } : item))
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      const targetIndex = prev.findIndex((i) => i.id === itemId);
      const remaining = prev.filter((item) => item.id !== itemId);
      if (selectedItemIdRef.current === itemId) {
        let nextSelectedId: string | null = null;
        if (remaining.length > 0) {
          const newIndex = Math.min(targetIndex >= 0 ? targetIndex : 0, remaining.length - 1);
          nextSelectedId = remaining[newIndex].id;
        }
        selectedItemIdRef.current = nextSelectedId;
        setSelectedItemId(nextSelectedId);
      }
      return remaining;
    });
    setItemPendingRemoval(null);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setBillDiscount(null);
    setCustomer(DEFAULT_CUSTOMER);
    selectedItemIdRef.current = null;
    setSelectedItemId(null);
    setItemPendingRemoval(null);
    setDefaultSalesperson(null);
    setShowClearConfirm(false);
  }, []);

  const loadCart = useCallback((newItems: CartItem[], newCustomer?: Customer) => {
    setItems(newItems);
    const lastId = newItems.length > 0 ? newItems[newItems.length - 1].id : null;
    selectedItemIdRef.current = lastId;
    setSelectedItemId(lastId);
    setItemPendingRemoval(null);
    if (newCustomer) {
      setCustomer(newCustomer);
    }
  }, []);

  // Calculation totals
  const { subtotal, itemDiscountsTotal } = useMemo(() => {
    let sub = 0;
    let itemDisc = 0;

    items.forEach((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      sub += lineSubtotal;

      if (item.discount) {
        if (item.discount.type === 'percentage') {
          itemDisc += lineSubtotal * (item.discount.value / 100);
        } else {
          itemDisc += item.discount.value;
        }
      }
    });

    return { subtotal: sub, itemDiscountsTotal: itemDisc };
  }, [items]);

  const billDiscountAmount = useMemo(() => {
    if (!billDiscount) return 0;
    const remainingSubtotal = Math.max(0, subtotal - itemDiscountsTotal);
    if (billDiscount.type === 'percentage') {
      return remainingSubtotal * (billDiscount.value / 100);
    }
    return Math.min(billDiscount.value, remainingSubtotal);
  }, [billDiscount, subtotal, itemDiscountsTotal]);

  const totalDiscount = itemDiscountsTotal + billDiscountAmount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const tax = taxableAmount * (taxRate / 100);
  const total = Math.round(taxableAmount + tax);

  const itemsCount = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        customer,
        billDiscount,
        taxRate,
        subtotal,
        totalDiscount,
        tax,
        total,
        itemsCount,
        selectedItemId,
        lastAddedItemId: selectedItemId,
        setSelectedItemId,
        selectNextItem,
        selectPreviousItem,
        incrementSelectedItem,
        decrementSelectedItem,
        incrementLastItem: incrementSelectedItem,
        decrementLastItem: decrementSelectedItem,
        addItem,
        updateQuantity,
        updateSalesperson,
        updateItemDiscount,
        updateItemNote,
        removeItem,
        clearCart,
        setCustomer,
        setBillDiscount,
        loadCart,
        itemPendingRemoval,
        setItemPendingRemoval,
        defaultSalesperson,
        setDefaultSalesperson,
        assignSalesperson,
        showClearConfirm,
        setShowClearConfirm,
        stockOverData,
        setStockOverData,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
