export type ConfectionCategory = 
  | 'all' 
  | 'chocolate' 
  | 'toffees' 
  | 'biscuits' 
  | 'drinks' 
  | 'gifts' 
  | 'others';

export interface Product {
  id: string;
  name: string;
  weight: string;
  price: number;
  category: ConfectionCategory;
  barcode: string;
  sku: string;
  stock: number;
  lowStockThreshold?: number;
  imageColor?: string;
  imageUrl?: string;
  brand?: string;
  description?: string;
}

export interface Salesperson {
  id: string;
  name: string;
  code: string;
  avatarInitials: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  salesperson?: Salesperson | null;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  } | null;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isWalkIn?: boolean;
}

export interface BillDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  reason: string;
}

export type PaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'bank_transfer' 
  | 'voucher' 
  | 'other';

export interface PaymentTender {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface CompletedSale {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  tax: number;
  total: number;
  cashier: string;
  customer?: Customer;
  tenders: PaymentTender[];
  change: number;
  status: 'Completed' | 'Refunded' | 'Partially Refunded' | 'Returned';
}

export interface HeldBill {
  id: string;
  holdCode: string;
  timestamp: string;
  items: CartItem[];
  itemsCount: number;
  total: number;
  cashier: string;
  customer?: Customer;
  note?: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason: string;
  returnToStock: boolean;
  refundAmount: number;
}

export interface ReturnRequest {
  id: string;
  returnCode: string;
  invoiceNumber: string;
  timestamp: string;
  items: ReturnItem[];
  totalRefund: number;
  status: 'Pending Admin Approval' | 'Approved' | 'Rejected';
  submittedBy: string;
}

export interface CashMovement {
  id: string;
  type: 'Cash In' | 'Cash Out' | 'Expense' | 'Bank Drop' | 'Petty Cash';
  amount: number;
  reason: string;
  reference?: string;
  notes?: string;
  timestamp: string;
  cashier: string;
}

export interface CashSession {
  cashier: string;
  register: string;
  startedAt: string;
  businessDate: string;
  openingCash: number;
  cashSales: number;
  cashRefunds: number;
  cashExpenses: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  countedCash?: number;
  difference?: number;
  differenceReason?: string;
  isClosed: boolean;
}
