import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, Product } from '@/types';
import { useSuppliers } from '@/stores/supplierStore';
import { useProducts } from '@/stores/productStore';
import { useToast } from '@/stores/toastStore';
import {
  Building2,
  Search,
  CheckCircle2,
  Loader2,
  Pencil,
} from 'lucide-react';
import { formatPhoneNumber, isValidPhoneNumber } from '@/utils/phoneValidator';

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSuccess?: (updated: Supplier) => void;
}

export const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}) => {
  const { updateSupplier } = useSuppliers();
  const { products, updateProduct } = useProducts();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [brand, setBrand] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('2');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isCompanySupplier, setIsCompanySupplier] = useState(false);
  const [assignedProductIds, setAssignedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form state whenever a new supplier is selected
  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setCode(supplier.code || '');
      setBrand(supplier.brand || '');
      setContactPerson(supplier.contactPerson || '');
      setPhone(formatPhoneNumber(supplier.phone || ''));
      setEmail(supplier.email || '');
      setLeadTimeDays(String(supplier.leadTimeDays || 2));
      setAddress(supplier.address || '');
      setStatus(supplier.status || 'Active');
      setIsCompanySupplier(Boolean(supplier.isCompanySupplier));

      // Aggregate assigned product IDs from supplier.suppliedProductIds and products list
      const productIdsFromProducts = products
        .filter(
          (p) =>
            p.supplierId === supplier.id ||
            p.batches?.some((b) => b.supplierId === supplier.id)
        )
        .map((p) => p.id);

      const combinedIds = Array.from(
        new Set([...(supplier.suppliedProductIds || []), ...productIdsFromProducts])
      );
      setAssignedProductIds(combinedIds);
      setProductSearch('');
    }
  }, [supplier, products, isOpen]);

  // When Company Supplier is ticked, show only company products; when unticked, show only non-company products
  const selectableProducts = useMemo(() => {
    if (isCompanySupplier) {
      return products.filter((p) => Boolean(p.isCompanyProduct));
    }
    return products.filter((p) => !p.isCompanyProduct);
  }, [products, isCompanySupplier]);

  // When toggling Company Supplier, keep only products matching the active mode
  useEffect(() => {
    if (isCompanySupplier) {
      setAssignedProductIds((prev) =>
        prev.filter((id) => products.find((p) => p.id === id)?.isCompanyProduct)
      );
    } else {
      setAssignedProductIds((prev) =>
        prev.filter((id) => !products.find((p) => p.id === id)?.isCompanyProduct)
      );
    }
  }, [isCompanySupplier, products]);

  // Filter products in catalogue table
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return selectableProducts;
    const q = productSearch.trim().toLowerCase();
    return selectableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [selectableProducts, productSearch]);

  if (!isOpen || !supplier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Supplier name is required', 'error');
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Partial<Supplier> = {
        name: name.trim(),
        code: code.trim() || supplier.code,
        brand: brand.trim() || undefined,
        contactPerson: contactPerson.trim() || 'General Sales',
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        leadTimeDays: parseInt(leadTimeDays, 10) || 2,
        status,
        isCompanySupplier,
        suppliedProductIds: assignedProductIds,
      };

      const res = await updateSupplier(supplier.id, updates);

      if (!res.success) {
        throw new Error(res.error || 'Failed to update supplier');
      }

      // Also sync productStore in-memory and local storage state
      assignedProductIds.forEach((pid) => {
        const prod = products.find((p) => p.id === pid);
        if (prod && prod.supplierId !== supplier.id) {
          updateProduct(pid, {
            supplierId: supplier.id,
            supplierName: name.trim(),
          });
        }
      });

      // For products that were unassigned
      products.forEach((prod) => {
        if (prod.supplierId === supplier.id && !assignedProductIds.includes(prod.id)) {
          updateProduct(prod.id, {
            supplierId: undefined,
            supplierName: undefined,
          });
        }
      });

      showToast(`Supplier "${name}" updated successfully in Supabase!`, 'success');
      onSuccess?.({ ...supplier, ...updates });
      onClose();
    } catch (err: any) {
      console.error('Error updating supplier:', err);
      showToast(err?.message || 'Failed to update supplier in Supabase', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#383736] text-stone-100 rounded-[22px] sm:rounded-[28px] w-full max-w-[1380px] h-[92vh] sm:h-[88vh] max-h-[780px] min-h-[500px] flex flex-col justify-between p-3 sm:p-4 md:p-5 shadow-2xl border border-stone-700/60 overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 sm:pb-2.5 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Pencil className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                Edit Supplier Details
              </h2>
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                {supplier.code}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 sm:px-4 py-1.5 rounded-full bg-[#2a2928] hover:bg-stone-700 text-stone-200 text-[11px] font-bold border border-stone-600/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || !isValidPhoneNumber(phone)}
              className="px-4 sm:px-5 py-1.5 rounded-full bg-[#00b4b6] hover:bg-[#009ca0] disabled:opacity-40 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Studio Main Workspace Card */}
        <div className="flex flex-col bg-white rounded-[18px] sm:rounded-[22px] p-3 sm:p-4 shadow-md border border-stone-200/80 flex-1 min-h-0 overflow-hidden text-stone-900">
          {/* Row 1: Header with Identity & Portfolio Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#FAF0E6] flex items-center justify-center text-[#9E6240] shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#9E6240]">
                Vendor Coordinates &amp; Assigned Portfolio
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400">
                  Status:
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                  className={`text-[10px] font-bold uppercase rounded-md px-2 py-0.5 border cursor-pointer ${
                    status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border-stone-300'
                  }`}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400">
                  Assigned Catalogue:
                </span>
                <span className="font-mono font-bold text-stone-900 text-[11px]">
                  {assignedProductIds.length} Products
                </span>
              </div>
            </div>
          </div>

          {/* Body Split: Left Side form, Right Side product selection */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 xl:gap-6 pt-3 overflow-hidden">
            {/* Left Side: Supplier & Person Details */}
            <div className="w-full lg:w-[360px] xl:w-[410px] shrink-0 flex flex-col justify-between min-h-0 overflow-y-auto pr-1">
              <div className="space-y-2.5 text-xs">
                {/* Supplier Name & Code */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 flex flex-col">
                    <label className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Company / Supplier Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Harischandra Mills"
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] transition-colors"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col">
                    <label className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Code
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="SUP-001"
                      className="w-full px-2 py-1.5 font-mono rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] transition-colors"
                    />
                  </div>
                </div>

                {/* Company Supplier Checkbox */}
                <div className="pt-0.5">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isCompanySupplier}
                      onChange={(e) => setIsCompanySupplier(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#00b4b6] rounded border-stone-300 focus:ring-0 cursor-pointer accent-[#00b4b6]"
                    />
                    <span className="text-[11px] font-bold text-stone-700">Company Supplier</span>
                  </label>
                </div>

                {/* Brand / Trade Name & Contact Person */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Brand / Trade Name
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. CBS Confectionery"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] transition-colors"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Sunil Perera"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] transition-colors"
                    />
                  </div>
                </div>

                {/* Phone Number & Lead Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                      placeholder="077 123 4567"
                      maxLength={12}
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] transition-colors font-mono"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Lead Time (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={leadTimeDays}
                      onChange={(e) => setLeadTimeDays(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex flex-col">
                  <label className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. supply@harischandra.lk"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] transition-colors"
                  />
                </div>

                {/* Physical Address */}
                <div className="flex flex-col">
                  <label className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                    Physical Address (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. No. 120, Station Road, Matara"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 text-[10px] text-stone-400 italic">
                Updates are pushed directly to the Supabase cloud ledger in real time.
              </div>
            </div>

            {/* Right Side: Product Catalogue Multi-Select Table */}
            <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden border border-stone-200 rounded-xl shadow-2xs">
              {/* Table Top Controls */}
              <div className="p-2 sm:p-2.5 bg-[#FAF7F2] border-b border-stone-200/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-stone-800 whitespace-nowrap">
                    Supplied Products
                  </span>
                  <span className="text-[10.5px] text-stone-400 whitespace-nowrap">
                    ({assignedProductIds.filter((id) => selectableProducts.some((p) => p.id === id)).length}/{selectableProducts.length} assigned)
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-1 sm:flex-initial justify-end">
                  {/* Search inside Catalogue */}
                  <div className="relative w-full sm:w-44 md:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search SKU, name..."
                      className="w-full pl-8 pr-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#00b4b6]"
                    />
                  </div>
                </div>
              </div>

              {/* Table View of Products */}
              <div className="flex-1 overflow-auto min-h-0">
                <table className="w-full border-collapse text-left text-xs min-w-[380px] sm:min-w-[460px]">
                  <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                    <tr className="border-b border-stone-200/70 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      <th className="py-2 px-2.5 w-9 text-center">
                        <input
                          type="checkbox"
                          checked={selectableProducts.length > 0 && selectableProducts.every((p) => assignedProductIds.includes(p.id))}
                          onChange={(e) => {
                            const allIds = selectableProducts.map((p) => p.id);
                            if (e.target.checked) {
                              setAssignedProductIds((prev) => Array.from(new Set([...prev, ...allIds])));
                            } else {
                              setAssignedProductIds((prev) => prev.filter((id) => !allIds.includes(id)));
                            }
                          }}
                          className="w-3.5 h-3.5 text-[#00b4b6] rounded focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-2 px-2.5">Product Name</th>
                      <th className="py-2 px-2.5">SKU / Code</th>
                      <th className="py-2 px-2.5">Brand</th>
                      <th className="py-2 px-2.5 hidden sm:table-cell">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredProducts.map((p) => {
                      const isChecked = assignedProductIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => {
                            if (isChecked) {
                              setAssignedProductIds((prev) => prev.filter((id) => id !== p.id));
                            } else {
                              setAssignedProductIds((prev) => [...prev, p.id]);
                            }
                          }}
                          className={`hover:bg-stone-50/80 cursor-pointer transition-colors ${
                            isChecked ? 'bg-[#00b4b6]/5' : ''
                          }`}
                        >
                          <td className="py-2 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignedProductIds((prev) => [...prev, p.id]);
                                } else {
                                  setAssignedProductIds((prev) => prev.filter((id) => id !== p.id));
                                }
                              }}
                              className="w-3.5 h-3.5 text-[#00b4b6] rounded focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-2.5 font-semibold text-stone-900">
                            <div className="truncate max-w-[140px] sm:max-w-[200px] xl:max-w-[280px]">
                              {p.name}{' '}
                              {p.weight && (
                                <span className="text-stone-400 font-normal text-[11px]">
                                  ({p.weight})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                            {p.sku}
                          </td>
                          <td className="py-2 px-2.5 text-stone-600 truncate max-w-[100px]">
                            {p.brand || '—'}
                          </td>
                          <td className="py-2 px-2.5 capitalize text-stone-500 text-[11px] hidden sm:table-cell">
                            {p.category || 'General'}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-stone-400">
                          {isCompanySupplier
                            ? 'No company products found. Mark products as "Company Product" in Catalog.'
                            : 'No matching products found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
