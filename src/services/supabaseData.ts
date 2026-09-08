import { supabase } from './supabase';
import {
  Product,
  ProductBatch,
  Supplier,
  StaffMember,
  PayrollDisbursement,
  CompletedSale,
  PurchaseOrder,
  PurchaseOrderItem,
  ReturnRequest,
  ReturnItem,
  SupplierReturn,
  OperatorCredential,
  CashSession,
  CashMovement,
} from '@/types';

// ============================================================================
// UUID GENERATOR (RFC 4122 Compliant)
// ============================================================================
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isValidUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// ============================================================================
// 1. OPERATORS
// ============================================================================

export async function fetchOperatorsFromSupabase(): Promise<OperatorCredential[]> {
  try {
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetch operators error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      handle: row.handle,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      pin: row.pin,
      status: row.status,
      avatarColor: row.avatar_color || 'teal',
      createdAt: row.created_at,
      notes: row.notes,
    }));
  } catch (err) {
    console.warn('Error connecting to Supabase for operators:', err);
    return [];
  }
}

export async function insertOperatorToSupabase(op: OperatorCredential) {
  try {
    const id = isValidUUID(op.id) ? op.id : generateUUID();
    const { data, error } = await supabase.from('operators').insert({
      id,
      name: op.name,
      handle: op.handle,
      email: op.email || null,
      password_hash: op.password || null,
      role: op.role,
      pin: op.pin,
      status: op.status,
      avatar_color: op.avatarColor || 'teal',
      notes: op.notes || null,
    }).select().single();

    if (error) console.warn('Supabase insert operator error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase insert operator failed:', err);
    return null;
  }
}

export async function updateOperatorInSupabase(id: string, updates: Partial<OperatorCredential>) {
  try {
    if (!isValidUUID(id)) return;
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.handle !== undefined) payload.handle = updates.handle;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.password !== undefined) payload.password_hash = updates.password;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.pin !== undefined) payload.pin = updates.pin;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.avatarColor !== undefined) payload.avatar_color = updates.avatarColor;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { error } = await supabase.from('operators').update(payload).eq('id', id);
    if (error) console.warn('Supabase update operator error:', error.message);
  } catch (err) {
    console.warn('Supabase update operator failed:', err);
  }
}

export async function deleteOperatorFromSupabase(id: string) {
  try {
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('operators').delete().eq('id', id);
    if (error) console.warn('Supabase delete operator error:', error.message);
  } catch (err) {
    console.warn('Supabase delete operator failed:', err);
  }
}

// ============================================================================
// 2. PRODUCTS & BATCHES
// ============================================================================

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  try {
    const { data: prods, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (prodErr) {
      console.warn('Supabase fetch products error:', prodErr.message);
      return [];
    }

    const { data: batches } = await supabase
      .from('product_batches')
      .select('*')
      .order('created_at', { ascending: true });

    const batchesByProduct = new Map<string, ProductBatch[]>();
    (batches || []).forEach((b: any) => {
      const list = batchesByProduct.get(b.product_id) || [];
      list.push({
        id: b.id,
        productId: b.product_id,
        supplierId: b.supplier_id || '',
        supplierName: b.supplier_name || '',
        batchNumber: b.batch_number,
        costPrice: Number(b.cost_price),
        sellingPrice: Number(b.selling_price),
        receivedDate: b.received_date || '',
        expiryDate: b.expiry_date || '',
        quantityReceived: Number(b.quantity_received),
        quantityRemaining: Number(b.quantity_remaining),
      });
      batchesByProduct.set(b.product_id, list);
    });

    return (prods || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category_slug,
      weight: p.weight || '50g',
      price: Number(p.price),
      costPrice: Number(p.cost_price),
      stock: Number(p.stock),
      lowStockThreshold: Number(p.low_stock_threshold || 5),
      brand: p.brand || '',
      imageUrl: p.image_url || '',
      description: p.description || '',
      isAvailable: p.is_available !== false,
      supplierId: p.supplier_id || undefined,
      batches: batchesByProduct.get(p.id) || [],
    }));
  } catch (err) {
    console.warn('Supabase fetch products failed:', err);
    return [];
  }
}

export async function upsertProductToSupabase(p: Product) {
  try {
    const id = isValidUUID(p.id) ? p.id : generateUUID();
    const { data, error } = await supabase.from('products').upsert({
      id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category_slug: p.category || 'others',
      weight: p.weight,
      price: p.price,
      cost_price: p.costPrice || 0,
      stock: p.stock,
      low_stock_threshold: p.lowStockThreshold || 5,
      brand: p.brand || null,
      image_url: p.imageUrl || null,
      description: p.description || null,
      is_available: p.isAvailable !== false,
      supplier_id: isValidUUID(p.supplierId) ? p.supplierId : null,
    }, { onConflict: 'id' }).select().single();

    if (error) console.warn('Supabase upsert product error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase upsert product failed:', err);
    return null;
  }
}

export async function deleteProductFromSupabase(id: string) {
  try {
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.warn('Supabase delete product error:', error.message);
  } catch (err) {
    console.warn('Supabase delete product failed:', err);
  }
}

export async function insertBatchToSupabase(b: ProductBatch) {
  try {
    const id = isValidUUID(b.id) ? b.id : generateUUID();
    const { error } = await supabase.from('product_batches').insert({
      id,
      product_id: b.productId,
      supplier_id: isValidUUID(b.supplierId) ? b.supplierId : null,
      supplier_name: b.supplierName,
      batch_number: b.batchNumber,
      cost_price: b.costPrice,
      selling_price: b.sellingPrice,
      quantity_received: b.quantityReceived,
      quantity_remaining: b.quantityRemaining,
      received_date: b.receivedDate && !isNaN(Date.parse(b.receivedDate)) ? new Date(b.receivedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      expiry_date: b.expiryDate && !isNaN(Date.parse(b.expiryDate)) ? new Date(b.expiryDate).toISOString().split('T')[0] : null,
    });

    if (error) console.warn('Supabase insert batch error:', error.message);
  } catch (err) {
    console.warn('Supabase insert batch failed:', err);
  }
}

export async function updateBatchRemainingInSupabase(batchId: string, quantityRemaining: number) {
  try {
    if (!isValidUUID(batchId)) return;
    const { error } = await supabase
      .from('product_batches')
      .update({ quantity_remaining: Math.max(0, quantityRemaining) })
      .eq('id', batchId);
    if (error) console.warn('Supabase update batch error:', error.message);
  } catch (err) {
    console.warn('Supabase update batch failed:', err);
  }
}

// ============================================================================
// 3. SUPPLIERS
// ============================================================================

export async function fetchSuppliersFromSupabase(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch suppliers error:', error.message);
      return [];
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      brand: s.brand || '',
      contactPerson: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      leadTimeDays: Number(s.lead_time_days || 2),
      status: s.status as 'Active' | 'Inactive',
    }));
  } catch (err) {
    console.warn('Supabase fetch suppliers failed:', err);
    return [];
  }
}

export async function upsertSupplierToSupabase(s: Supplier) {
  try {
    const id = isValidUUID(s.id) ? s.id : generateUUID();
    const { data, error } = await supabase.from('suppliers').upsert({
      id,
      code: s.code,
      name: s.name,
      brand: s.brand || null,
      contact_person: s.contactPerson || null,
      phone: s.phone || '',
      email: s.email || null,
      address: s.address || null,
      lead_time_days: s.leadTimeDays || 2,
      status: s.status || 'Active',
    }, { onConflict: 'id' }).select().single();

    if (error) console.warn('Supabase upsert supplier error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase upsert supplier failed:', err);
    return null;
  }
}

// ============================================================================
// 4. STAFF & PAYROLL
// ============================================================================

export async function fetchStaffFromSupabase(): Promise<StaffMember[]> {
  try {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch staff error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      nic: row.nic,
      phone: row.phone,
      email: row.email || '',
      address: row.address || '',
      emergencyContact: row.emergency_contact || '',
      role: row.role || 'Staff',
      attendances: Number(row.attendances || 0),
      baseSalary: Number(row.base_salary || 0),
      payFrequency: row.pay_frequency || 'Monthly',
      salaryDate: row.salary_date || '28th of Month',
      overtimeRate: Number(row.overtime_rate || 400),
      status: row.status as 'Active' | 'Inactive',
      bankName: row.bank_name || '',
      bankAccount: row.bank_account || '',
      bankBranch: row.bank_branch || '',
      notes: row.notes || '',
      joiningDate: row.joining_date || '',
      monthlySalesAttributed: Number(row.monthly_sales_attributed || 0),
      isPaidThisMonth: Boolean(row.is_paid_this_month),
      lastPaidDate: row.last_paid_date || '',
      lastPaidAmount: Number(row.last_paid_amount || 0),
    }));
  } catch (err) {
    console.warn('Supabase fetch staff failed:', err);
    return [];
  }
}

export async function upsertStaffToSupabase(staff: StaffMember) {
  try {
    const id = isValidUUID(staff.id) ? staff.id : generateUUID();
    const { data, error } = await supabase.from('staff_members').upsert({
      id,
      name: staff.name,
      nic: staff.nic || null,
      phone: staff.phone,
      email: staff.email || null,
      address: staff.address || null,
      emergency_contact: staff.emergencyContact || null,
      role: staff.role,
      attendances: staff.attendances || 0,
      base_salary: staff.baseSalary,
      pay_frequency: staff.payFrequency || 'Monthly',
      salary_date: staff.salaryDate || '28th of Month',
      overtime_rate: staff.overtimeRate || 400,
      status: staff.status || 'Active',
      bank_name: staff.bankName || null,
      bank_account: staff.bankAccount || null,
      bank_branch: staff.bankBranch || null,
      notes: staff.notes || null,
      is_paid_this_month: Boolean(staff.isPaidThisMonth),
      last_paid_date: staff.lastPaidDate || null,
      last_paid_amount: staff.lastPaidAmount || null,
    }, { onConflict: 'id' }).select().single();

    if (error) console.warn('Supabase upsert staff error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase upsert staff failed:', err);
    return null;
  }
}

export async function deleteStaffFromSupabase(id: string) {
  try {
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('staff_members').delete().eq('id', id);
    if (error) console.warn('Supabase delete staff error:', error.message);
  } catch (err) {
    console.warn('Supabase delete staff failed:', err);
  }
}

export async function fetchPayrollFromSupabase(): Promise<PayrollDisbursement[]> {
  try {
    const { data, error } = await supabase
      .from('payroll_disbursements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch payroll error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      staffId: row.staff_id,
      staffName: row.staff_name,
      role: row.role,
      transactionDate: row.transaction_date,
      disbursementMode: row.disbursement_mode,
      basicSalary: Number(row.basic_salary),
      overtimeHours: Number(row.overtime_hours),
      overtimeRate: Number(row.overtime_rate),
      overtimeAmount: Number(row.overtime_amount),
      bonusAmount: Number(row.bonus_amount),
      bonusReason: row.bonus_reason || '',
      deductionAmount: Number(row.deduction_amount),
      deductionReason: row.deduction_reason || '',
      totalPayable: Number(row.total_payable),
      paymentMethod: row.payment_method,
      bankDetails: row.bank_details || '',
      notes: row.notes || '',
    }));
  } catch (err) {
    console.warn('Supabase fetch payroll failed:', err);
    return [];
  }
}

export async function insertPayrollToSupabase(p: PayrollDisbursement) {
  try {
    const id = isValidUUID(p.id) ? p.id : generateUUID();
    const { error } = await supabase.from('payroll_disbursements').insert({
      id,
      staff_id: isValidUUID(p.staffId) ? p.staffId : null,
      staff_name: p.staffName,
      role: p.role,
      transaction_date: p.transactionDate || new Date().toISOString().split('T')[0],
      disbursement_mode: p.disbursementMode || 'Salary Settlement',
      basic_salary: p.basicSalary,
      overtime_hours: p.overtimeHours,
      overtime_rate: p.overtimeRate,
      overtime_amount: p.overtimeAmount,
      bonus_amount: p.bonusAmount,
      bonus_reason: p.bonusReason || null,
      deduction_amount: p.deductionAmount,
      deduction_reason: p.deductionReason || null,
      total_payable: p.totalPayable,
      payment_method: p.paymentMethod || 'Bank Transfer',
      bank_details: p.bankDetails || null,
      notes: p.notes || null,
    });

    if (error) console.warn('Supabase insert payroll error:', error.message);
  } catch (err) {
    console.warn('Supabase insert payroll failed:', err);
  }
}

// ============================================================================
// 5. SALES INVOICES & PAYMENTS
// ============================================================================

export async function fetchSalesFromSupabase(): Promise<CompletedSale[]> {
  try {
    const { data: invoices, error } = await supabase
      .from('sales_invoices')
      .select('*, sales_items(*), payment_tenders(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch sales error:', error.message);
      return [];
    }

    return (invoices || []).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      timestamp: inv.sale_time || '',
      date: inv.date_str || 'Today',
      cashier: inv.cashier_name,
      salesperson: inv.salesperson_id ? {
        id: inv.salesperson_id,
        name: inv.salesperson_name || '',
        code: '',
        avatarInitials: (inv.salesperson_name || 'SP').slice(0, 2).toUpperCase(),
      } : null,
      customer: inv.customer_name ? {
        id: inv.customer_id || 'cust-1',
        name: inv.customer_name,
        phone: inv.customer_phone || '',
      } : undefined,
      items: (inv.sales_items || []).map((it: any) => ({
        id: it.id,
        product: {
          id: it.product_id || '',
          name: it.product_name,
          price: Number(it.unit_price),
          sku: '',
          barcode: '',
          weight: '',
          category: 'others',
          stock: 0,
        },
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
      })),
      subtotal: Number(inv.subtotal),
      discountTotal: Number(inv.discount_total || 0),
      tax: Number(inv.tax || 0),
      total: Number(inv.total),
      tenders: (inv.payment_tenders || []).map((t: any) => ({
        method: t.method,
        amount: Number(t.amount),
      })),
      change: Number(inv.change_amount || 0),
      status: inv.status as 'Completed' | 'Refunded',
    }));
  } catch (err) {
    console.warn('Supabase fetch sales failed:', err);
    return [];
  }
}

export async function insertSaleToSupabase(sale: CompletedSale) {
  try {
    const invoiceId = isValidUUID(sale.id) ? sale.id : generateUUID();
    const { data: inv, error: invErr } = await supabase.from('sales_invoices').insert({
      id: invoiceId,
      invoice_number: sale.invoiceNumber,
      date_str: sale.date || 'Today',
      sale_date: new Date().toISOString().split('T')[0],
      sale_time: sale.timestamp || new Date().toLocaleTimeString(),
      cashier_name: sale.cashier,
      salesperson_id: isValidUUID(sale.salesperson?.id) ? sale.salesperson?.id : null,
      salesperson_name: sale.salesperson?.name || null,
      customer_name: sale.customer?.name || 'Walk-in Customer',
      customer_phone: sale.customer?.phone || null,
      subtotal: sale.subtotal,
      discount_total: sale.discountTotal || 0,
      tax: sale.tax || 0,
      total: sale.total,
      change_amount: sale.change || 0,
      status: sale.status || 'Completed',
    }).select().single();

    if (invErr || !inv) {
      console.warn('Supabase insert invoice error:', invErr?.message);
      return;
    }

    // Insert line items
    if (sale.items.length > 0) {
      const itemRows = sale.items.map((it) => ({
        id: generateUUID(),
        invoice_id: inv.id,
        product_id: isValidUUID(it.product.id) ? it.product.id : null,
        product_name: it.product.name,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        cost_price: it.product.costPrice || 0,
        subtotal: it.quantity * it.unitPrice,
      }));
      await supabase.from('sales_items').insert(itemRows);
    }

    // Insert payment tenders
    if (sale.tenders.length > 0) {
      const tenderRows = sale.tenders.map((t) => {
        let cleanMethod = (t.method || 'cash').toLowerCase();
        if (!['cash', 'card', 'bank_transfer', 'voucher', 'other'].includes(cleanMethod)) {
          cleanMethod = 'cash';
        }
        return {
          id: generateUUID(),
          invoice_id: inv.id,
          method: cleanMethod,
          amount: t.amount,
        };
      });
      await supabase.from('payment_tenders').insert(tenderRows);
    }
  } catch (err) {
    console.warn('Supabase insert sale failed:', err);
  }
}

// ============================================================================
// 6. PURCHASE ORDERS
// ============================================================================

export async function fetchPurchaseOrdersFromSupabase(): Promise<PurchaseOrder[]> {
  try {
    const { data: pos, error } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch POs error:', error.message);
      return [];
    }

    return (pos || []).map((row: any) => ({
      id: row.id,
      poNumber: row.po_number,
      invoiceRef: row.invoice_ref,
      supplierId: row.supplier_id || '',
      supplierName: row.supplier_name,
      date: row.date || '',
      time: row.time || '',
      isRolledOver: Boolean(row.is_rolled_over),
      items: (row.purchase_order_items || []).map((it: any) => ({
        id: it.id,
        productId: it.product_id,
        productName: it.product_name,
        weight: it.weight || '',
        batchNumber: it.batch_number || '',
        expiryDate: it.expiry_date || '',
        quantity: Number(it.quantity),
        costPrice: Number(it.cost_price),
        sellingPrice: Number(it.selling_price),
        subtotal: Number(it.subtotal),
      })),
      totalInvoiced: Number(row.total_invoiced),
      totalPaid: Number(row.total_paid),
      balanceDue: Number(row.balance_due),
      paymentStatus: row.payment_status,
      paymentBreakdown: {
        cash: Number(row.payment_cash || 0),
        card: Number(row.payment_card || 0),
        cheque: Number(row.payment_cheque || 0),
        chequeDueDate: row.cheque_due_date || '',
        chequeNumber: row.cheque_number || '',
        unpaidDueDate: row.unpaid_due_date || '',
      },
      verifiedBy: row.verified_by,
      notes: row.notes,
    }));
  } catch (err) {
    console.warn('Supabase fetch purchase orders failed:', err);
    return [];
  }
}

export async function insertPurchaseOrderToSupabase(po: PurchaseOrder) {
  try {
    const poId = isValidUUID(po.id) ? po.id : generateUUID();
    const { data, error } = await supabase.from('purchase_orders').insert({
      id: poId,
      po_number: po.poNumber,
      invoice_ref: po.invoiceRef,
      supplier_id: isValidUUID(po.supplierId) ? po.supplierId : null,
      supplier_name: po.supplierName,
      date: po.date,
      po_date: new Date().toISOString().split('T')[0],
      time: po.time,
      total_invoiced: po.totalInvoiced,
      total_paid: po.totalPaid,
      balance_due: po.balanceDue,
      payment_status: po.paymentStatus,
      payment_cash: po.paymentBreakdown?.cash || 0,
      payment_card: po.paymentBreakdown?.card || 0,
      payment_cheque: po.paymentBreakdown?.cheque || 0,
      cheque_due_date: po.paymentBreakdown?.chequeDueDate || null,
      cheque_number: po.paymentBreakdown?.chequeNumber || null,
      unpaid_due_date: po.paymentBreakdown?.unpaidDueDate || null,
      notes: po.notes || null,
      verified_by: po.verifiedBy || 'Store Manager',
    }).select().single();

    if (error || !data) {
      console.warn('Supabase insert purchase order error:', error?.message);
      return;
    }

    if (po.items && po.items.length > 0) {
      const itemRows = po.items.map((it) => ({
        id: generateUUID(),
        purchase_order_id: data.id,
        product_id: isValidUUID(it.productId) ? it.productId : null,
        product_name: it.productName,
        weight: it.weight,
        batch_number: it.batchNumber,
        expiry_date: it.expiryDate,
        quantity: it.quantity,
        cost_price: it.costPrice,
        selling_price: it.sellingPrice,
        subtotal: it.subtotal,
      }));
      await supabase.from('purchase_order_items').insert(itemRows);
    }
  } catch (err) {
    console.warn('Supabase insert purchase order failed:', err);
  }
}

export async function updatePurchaseOrderStatusInSupabase(
  id: string,
  status: string,
  totalPaid: number,
  balanceDue: number
) {
  try {
    if (!isValidUUID(id)) return;
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        payment_status: status,
        total_paid: totalPaid,
        balance_due: balanceDue,
      })
      .eq('id', id);
    if (error) console.warn('Supabase update PO status error:', error.message);
  } catch (err) {
    console.warn('Supabase update PO status failed:', err);
  }
}

// ============================================================================
// 7. CUSTOMER RETURNS
// ============================================================================

export async function fetchReturnRequestsFromSupabase(): Promise<ReturnRequest[]> {
  try {
    const { data: reqs, error } = await supabase
      .from('return_requests')
      .select('*, return_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch return requests error:', error.message);
      return [];
    }

    return (reqs || []).map((row: any) => ({
      id: row.id,
      returnCode: row.return_code,
      invoiceNumber: row.invoice_number,
      timestamp: row.timestamp || new Date().toISOString(),
      date: row.date_str || 'Today',
      items: (row.return_items || []).map((it: any) => ({
        productId: it.product_id || '',
        productName: it.product_name,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        reason: it.reason,
        returnToStock: Boolean(it.return_to_stock),
        refundAmount: Number(it.refund_amount),
        supplierId: it.supplier_id || '',
        supplierName: it.supplier_name || '',
        batchNumber: it.batch_number || '',
      })),
      totalRefund: Number(row.total_refund),
      submittedBy: row.submitted_by,
      status: row.status,
      resolutionType: row.resolution_type,
      reviewNotes: row.review_notes,
    }));
  } catch (err) {
    console.warn('Supabase fetch returns failed:', err);
    return [];
  }
}

export async function insertReturnRequestToSupabase(ret: ReturnRequest) {
  try {
    const id = isValidUUID(ret.id) ? ret.id : generateUUID();
    const { data, error } = await supabase.from('return_requests').insert({
      id,
      return_code: ret.returnCode,
      invoice_number: ret.invoiceNumber,
      date_str: ret.date || 'Today',
      total_refund: ret.totalRefund,
      resolution_type: ret.resolutionType || 'refund',
      status: ret.status || 'Pending Admin Approval',
      submitted_by: ret.submittedBy,
      review_notes: ret.reviewNotes || null,
    }).select().single();

    if (error || !data) {
      console.warn('Supabase insert return request error:', error?.message);
      return;
    }

    if (ret.items && ret.items.length > 0) {
      const itemRows = ret.items.map((it) => ({
        id: generateUUID(),
        return_request_id: data.id,
        product_id: isValidUUID(it.productId) ? it.productId : null,
        product_name: it.productName,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        reason: it.reason,
        return_to_stock: Boolean(it.returnToStock),
        refund_amount: it.refundAmount,
        supplier_id: isValidUUID(it.supplierId) ? it.supplierId : null,
        supplier_name: it.supplierName || null,
        batch_number: it.batchNumber || null,
      }));
      await supabase.from('return_items').insert(itemRows);
    }
  } catch (err) {
    console.warn('Supabase insert return request failed:', err);
  }
}

export async function updateReturnRequestInSupabase(
  id: string,
  status: string,
  reviewNotes?: string,
  reviewedBy?: string
) {
  try {
    if (!isValidUUID(id)) return;
    const { error } = await supabase
      .from('return_requests')
      .update({
        status,
        review_notes: reviewNotes || null,
        reviewed_by: reviewedBy || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) console.warn('Supabase update return status error:', error.message);
  } catch (err) {
    console.warn('Supabase update return status failed:', err);
  }
}

// ============================================================================
// 10. CASH SESSIONS & TILL RECONCILIATION
// ============================================================================

export async function fetchCashSessionsFromSupabase(): Promise<CashSession[]> {
  try {
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch cash_sessions error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      cashier: row.cashier_name || 'Cashier',
      register: row.register_code || 'POS-01',
      startedAt: row.started_at ? new Date(row.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
      closedAt: row.closed_at ? new Date(row.closed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
      businessDate: row.business_date || '',
      sessionDate: row.business_date || '',
      openingCash: Number(row.opening_cash) || 0,
      cashSales: Number(row.cash_sales) || 0,
      cashRefunds: Number(row.cash_refunds) || 0,
      cashExpenses: Number(row.cash_expenses) || 0,
      cashIn: Number(row.cash_in) || 0,
      cashOut: Number(row.cash_out) || 0,
      expectedCash: Number(row.expected_cash) || 0,
      countedCash: row.counted_cash !== null && row.counted_cash !== undefined ? Number(row.counted_cash) : undefined,
      difference: Number(row.difference) || 0,
      differenceReason: row.difference_reason || '',
      isClosed: Boolean(row.is_closed),
    }));
  } catch (err) {
    console.warn('Error connecting to Supabase for cash_sessions:', err);
    return [];
  }
}

export async function insertCashSessionToSupabase(session: CashSession): Promise<CashSession> {
  try {
    const id = isValidUUID(session.id) ? session.id : generateUUID();
    const { data, error } = await supabase.from('cash_sessions').insert({
      id,
      cashier_name: session.cashier || 'Cashier',
      register_code: session.register || 'POS-01',
      business_date: session.sessionDate || new Date().toISOString().split('T')[0],
      opening_cash: session.openingCash || 0,
      cash_sales: session.cashSales || 0,
      cash_refunds: session.cashRefunds || 0,
      cash_expenses: session.cashExpenses || 0,
      cash_in: session.cashIn || 0,
      cash_out: session.cashOut || 0,
      expected_cash: session.expectedCash || 0,
      counted_cash: session.countedCash ?? null,
      difference: session.difference || 0,
      difference_reason: session.differenceReason || null,
      is_closed: Boolean(session.isClosed),
    }).select().single();

    if (error) console.warn('Supabase insert cash_session error:', error.message);
    return data ? { ...session, id: data.id } : { ...session, id };
  } catch (err) {
    console.warn('Supabase insert cash_session failed:', err);
    return session;
  }
}

export async function updateCashSessionInSupabase(id: string, updates: Partial<CashSession>) {
  try {
    if (!isValidUUID(id)) return;
    const payload: any = {};
    if (updates.cashSales !== undefined) payload.cash_sales = updates.cashSales;
    if (updates.cashRefunds !== undefined) payload.cash_refunds = updates.cashRefunds;
    if (updates.cashExpenses !== undefined) payload.cash_expenses = updates.cashExpenses;
    if (updates.cashIn !== undefined) payload.cash_in = updates.cashIn;
    if (updates.cashOut !== undefined) payload.cash_out = updates.cashOut;
    if (updates.expectedCash !== undefined) payload.expected_cash = updates.expectedCash;
    if (updates.countedCash !== undefined) payload.counted_cash = updates.countedCash;
    if (updates.difference !== undefined) payload.difference = updates.difference;
    if (updates.differenceReason !== undefined) payload.difference_reason = updates.differenceReason;
    if (updates.isClosed !== undefined) {
      payload.is_closed = updates.isClosed;
      if (updates.isClosed) {
        payload.closed_at = new Date().toISOString();
      }
    }

    const { error } = await supabase.from('cash_sessions').update(payload).eq('id', id);
    if (error) console.warn('Supabase update cash_session error:', error.message);
  } catch (err) {
    console.warn('Supabase update cash_session failed:', err);
  }
}

// ============================================================================
// 11. CASH MOVEMENTS (EXPENSES, CASH IN, CASH OUT, PETTY CASH)
// ============================================================================

export async function fetchCashMovementsFromSupabase(): Promise<CashMovement[]> {
  try {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('Supabase fetch cash_movements error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount) || 0,
      reason: row.reason || '',
      reference: row.reference || '',
      notes: row.notes || '',
      cashier: row.cashier || 'Cashier',
      timestamp: row.timestamp ? new Date(row.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
      date: row.business_date || '',
    }));
  } catch (err) {
    console.warn('Error connecting to Supabase for cash_movements:', err);
    return [];
  }
}

export async function insertCashMovementToSupabase(movement: CashMovement, sessionId?: string): Promise<CashMovement> {
  try {
    const id = isValidUUID(movement.id) ? movement.id : generateUUID();
    let validSessionId: string | null = isValidUUID(sessionId) ? sessionId! : null;

    if (validSessionId) {
      // Verify session exists in Supabase to avoid FK violation
      const { data: existingSess } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('id', validSessionId)
        .maybeSingle();
      if (!existingSess) {
        validSessionId = null;
      }
    }

    const payload: any = {
      id,
      cash_session_id: validSessionId,
      type: movement.type,
      amount: movement.amount || 0,
      reason: movement.reason || '',
      reference: movement.reference || null,
      notes: movement.notes || null,
      cashier: movement.cashier || 'Cashier',
      business_date: movement.date || new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('cash_movements').insert(payload).select().single();

    if (error) {
      console.warn('Supabase insert cash_movement error:', error.message);
      // Fallback: insert without cash_session_id if FK error occurred
      if (validSessionId) {
        payload.cash_session_id = null;
        const retry = await supabase.from('cash_movements').insert(payload).select().single();
        if (retry.data) return { ...movement, id: retry.data.id };
      }
    }

    return data ? { ...movement, id: data.id } : { ...movement, id };
  } catch (err) {
    console.warn('Supabase insert cash_movement failed:', err);
    return movement;
  }
}

