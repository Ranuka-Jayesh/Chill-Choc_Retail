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
  brand?: string;
  code: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  leadTimeDays?: number;
  rating?: number;
  status: 'Active' | 'Inactive';
  since?: string;
  suppliedProductIds?: string[];
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
  supplierId?: string;
  supplierName?: string;
}

export interface Salesperson {
  id: string;
  name: string;
  code: string;
  avatarInitials: string;
}

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  costPrice?: number;
  expiryDate?: string;
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
  batchAllocations?: BatchAllocation[];
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
  salesperson?: Salesperson | null;
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

export interface ExchangeItemDetails {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalValue: number;
  priceDifference: number; // positive = customer pays extra, negative = customer gets refund, 0 = equal value
}

export interface ReturnRequest {
  id: string;
  returnCode: string;
  invoiceNumber: string;
  date?: string;
  timestamp: string;
  items: ReturnItem[];
  totalRefund: number;
  resolutionType: 'refund' | 'same_replacement' | 'exchange';
  exchangeItem?: ExchangeItemDetails;
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
  date?: string;
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
  date?: string; // YYYY-MM-DD for precise date filtering
}

export interface CashSession {
  id?: string;
  cashier: string;
  register: string;
  startedAt: string;
  closedAt?: string;
  businessDate: string;
  sessionDate?: string; // YYYY-MM-DD
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
  chequeStatus?: 'PENDING' | 'CLEARED' | 'CANCELLED';
  previousChequeNumber?: string;
  unpaidDueDate?: string;
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

export interface StaffMember {
  id: string;
  name: string;
  nic?: string;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  role: string;
  attendances: number;
  baseSalary: number;
  payFrequency: 'Monthly' | 'Bi-weekly' | 'Weekly';
  salaryDate: string; // e.g. "28th of Month"
  overtimeRate: number; // e.g. 450
  status: 'Active' | 'Inactive' | 'On Leave';
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  notes?: string;
  joiningDate?: string;
  monthlySalesAttributed?: number;
  isPaidThisMonth?: boolean;
  lastPaidDate?: string;
  lastPaidAmount?: number;
}

export interface PayrollDisbursement {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  transactionDate: string;
  disbursementMode: 'Salary Settlement' | 'Salary Advance';
  basicSalary: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeAmount: number;
  bonusAmount: number;
  bonusReason?: string;
  deductionAmount: number;
  deductionReason?: string;
  totalPayable: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque';
  bankDetails?: string;
  notes?: string;
}

export type OperatorRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface OperatorCredential {
  id: string;
  name: string;
  handle: string; // e.g. "@admin", "@cashier", "@manager"
  email?: string;
  password?: string; // Account password for Admin & Manager logins
  role: OperatorRole;
  pin: string; // 4-digit PIN e.g. "1234"
  status: 'Active' | 'Blocked';
  avatarColor?: 'teal' | 'gold' | 'indigo' | 'rose' | 'slate';
  createdAt?: string;
  lastActiveAt?: string;
  notes?: string;
}



