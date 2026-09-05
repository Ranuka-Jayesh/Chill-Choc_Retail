import React, { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Product, CartItem, Salesperson, Customer, BillDiscount } from '@/types';
import { useToast } from './toastStore';

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
  addItem: (product: Product, quantity?: number, salesperson?: Salesperson | null) => void;
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
}

const DEFAULT_CUSTOMER: Customer = {
  id: 'cust-walkin',
  name: 'Walk-in Customer',
  phone: '',
  isWalkIn: true,
};

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

  const addItem = useCallback((product: Product, quantity = 1, salesperson: Salesperson | null = null) => {
    if (product.stock <= 0) {
      showToast(`${product.name} is Out of Stock`, 'error');
      return;
    }

    const existingItem = items.find((item) => item.product.id === product.id);

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > product.stock) {
        showToast(`Cannot add more. Only ${product.stock} units in stock.`, 'warning');
        return;
      }

      selectedItemIdRef.current = existingItem.id;
      setSelectedItemId(existingItem.id);
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        )
      );
      setTimeout(() => {
        const el = document.getElementById(`cart-item-row-${existingItem.id}`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 10);
    } else {
      const effectiveSalesperson = salesperson || defaultSalesperson;
      const newItem: CartItem = {
        id: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        product,
        quantity,
        unitPrice: product.price,
        salesperson: effectiveSalesperson,
        discount: null,
      };
      selectedItemIdRef.current = newItem.id;
      setSelectedItemId(newItem.id);
      setItems((prevItems) => [...prevItems, newItem]);
      setTimeout(() => {
        const el = document.getElementById(`cart-item-row-${newItem.id}`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 10);
    }
  }, [items, showToast]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
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

    selectedItemIdRef.current = itemId;
    setSelectedItemId(itemId);
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  }, [items, showToast]);

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
    setItems((prev) =>
      prev.map((item) =>
        item.id === targetId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }, [showToast]);

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

    setItems((prev) =>
      prev.map((item) =>
        item.id === targetId ? { ...item, quantity: item.quantity - 1 } : item
      )
    );
  }, []);

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
    } else if (selectedItemIdRef.current) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemIdRef.current ? { ...item, salesperson: sp } : item
        )
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
