export type ConfectionCategory = 
  | 'all' 
  | 'chocolate' 
  | 'toffees' 
  | 'biscuits' 
  | 'drinks' 
  | 'gifts' 
  | 'others'
  | (string & {});

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email?: string;
  leadTimeDays?: number;
  rating?: number;
  status: 'Active' | 'Inactive';
}

export interface ProductBatch {
  id: string;
  productId: string;
  supplierId: string;
  supplierName: string;
  batchNumber: string;
  costPrice: number;
  sellingPrice: number;
  receivedDate: string;
  expiryDate?: string;
  quantityReceived: number;
  quantityRemaining: number;
}

export interface Product {
  id: string;
  name: string;
  weight: string;
  price: number;
  costPrice?: number;
  category: ConfectionCategory;
  barcode: string;
  sku: string;
  stock: number;
  lowStockThreshold?: number;
  imageColor?: string;
  imageUrl?: string;
  brand?: string;
  description?: string;
  batches?: ProductBatch[];
  isAvailable?: boolean;
  expiryDate?: string;
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
  supplierId?: string;
  supplierName?: string;
  batchNumber?: string;
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
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  supplierReturnId?: string;
}

export interface SupplierReturn {
  id: string;
  returnCode: string; // e.g. "RTV-0042"
  supplierId: string;
  supplierName: string;
  customerInvoiceNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalDebitAmount: number;
  batchNumber: string;
  reason: 'Damaged' | 'Expired' | 'Quality Issue' | 'Customer Changed Mind' | 'Wrong Product' | 'Packaging Defect' | 'Other';
  claimStatus: 'Pending Dispatch' | 'Dispatched to Supplier' | 'Credit Note Received' | 'Replacement Received' | 'Rejected by Supplier';
  timestamp: string;
  notes?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Store Manager' | 'Inventory Admin';
  avatarInitials: string;
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

export type POPaymentStatus = 'PAID' | 'CHEQUE PENDING' | 'CREDIT' | 'PARTIAL';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  weight?: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  subtotal: number;
}

export interface POPaymentBreakdown {
  cash: number;
  card: number;
  cheque: number;
  chequeDueDate?: string;
  chequeNumber?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;           // e.g. "PO-8803"
  invoiceRef: string;         // e.g. "CBS-4412"
  supplierId: string;
  supplierName: string;
  date: string;               // e.g. "Aug 27, 2026"
  time: string;               // e.g. "04:30 PM"
  isRolledOver?: boolean;
  items: PurchaseOrderItem[];
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
  paymentStatus: POPaymentStatus;
  paymentBreakdown: POPaymentBreakdown;
  notes?: string;
  verifiedBy: string;         // e.g. "Store Manager"
}

