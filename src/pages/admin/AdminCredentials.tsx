import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOperators } from '@/stores/operatorStore';
import { useToast } from '@/stores/toastStore';
import { OperatorCredential, OperatorRole } from '@/types';
import {
  Users,
  Key,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Plus,
  Radio,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  ShieldAlert,
  Mail,
} from 'lucide-react';

export const AdminCredentials: React.FC = () => {
  const {
    operators,
    isWsConnected,
    addOperator,
    updateOperator,
    deleteOperator,
    toggleStatus,
  } = useOperators();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ALL' | 'CASHIER' | 'MANAGER' | 'ADMIN'>('ALL');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorCredential | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formHandle, setFormHandle] = useState('');
  const [formRole, setFormRole] = useState<OperatorRole>('CASHIER');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formPin, setFormPin] = useState('');
  const [formShowPin, setFormShowPin] = useState(false);
  const [formStatus, setFormStatus] = useState<'Active' | 'Blocked'>('Active');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Delete modal state
  const [deletingOperator, setDeletingOperator] = useState<OperatorCredential | null>(null);

  // Counts
  const counts = useMemo(() => {
    return {
      all: operators.length,
      cashiers: operators.filter((o) => o.role === 'CASHIER').length,
      managers: operators.filter((o) => o.role === 'MANAGER').length,
      admins: operators.filter((o) => o.role === 'ADMIN').length,
    };
  }, [operators]);

  // Filtered operators
  const filteredOperators = useMemo(() => {
    if (activeTab === 'ALL') return operators;
    return operators.filter((o) => o.role === activeTab);
  }, [operators, activeTab]);

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleStatus = (op: OperatorCredential) => {
    const nextStatus = op.status === 'Active' ? 'Blocked' : 'Active';
    toggleStatus(op.id);
    if (nextStatus === 'Blocked') {
      showToast(
        `Operator Blocked: ${op.name} (${op.handle}) has been suspended in real-time. POS terminal locked via WebSocket.`,
        'error'
      );
    } else {
      showToast(
        `Operator Unblocked: ${op.name} (${op.handle}) access restored. Can now unlock POS terminal.`,
        'success'
      );
    }
  };

  const handleOpenAddModal = () => {
    setEditingOperator(null);
    setFormName('');
    setFormHandle('@');
    setFormRole('CASHIER');
    setFormEmail('');
    setFormPassword('');
    setFormShowPassword(false);
    setFormPin('');
    setFormShowPin(false);
    setFormStatus('Active');
    setFormNotes('');
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (op: OperatorCredential) => {
    setEditingOperator(op);
    setFormName(op.name);
    setFormHandle(op.handle.startsWith('@') ? op.handle : `@${op.handle}`);
    setFormRole(op.role);
    setFormEmail(op.email || '');
    setFormPassword(op.password || '');
    setFormShowPassword(false);
    setFormPin(op.pin);
    setFormShowPin(false);
    setFormStatus(op.status);
    setFormNotes(op.notes || '');
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleSaveOperator = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter operator name');
      return;
    }

    const cleanHandle = formHandle.trim().replace(/^@+/, '');
    if (!cleanHandle) {
      setFormError('Please enter a username or handle');
      return;
    }

    if (!/^\d{4}$/.test(formPin)) {
      setFormError('PIN must be exactly 4 numeric digits');
      return;
    }

    if (formRole === 'ADMIN' || formRole === 'MANAGER') {
      if (!formEmail.trim()) {
        setFormError(`Please enter a valid email address for the ${formRole}`);
        return;
      }
      if (!formPassword.trim() || formPassword.trim().length < 4) {
        setFormError(`Please enter a password (min 4 characters) for the ${formRole}`);
        return;
      }
    }

    const opEmail = (formRole === 'ADMIN' || formRole === 'MANAGER') ? formEmail.trim() : (formEmail.trim() || undefined);
    const opPassword = (formRole === 'ADMIN' || formRole === 'MANAGER') ? formPassword.trim() : undefined;

    if (editingOperator) {
      updateOperator(editingOperator.id, {
        name: formName.trim(),
        handle: `@${cleanHandle}`,
        role: formRole,
        email: opEmail,
        password: opPassword,
        pin: formPin,
        status: formStatus,
        notes: formNotes.trim(),
      });
      showToast(
        `Updated credentials for ${formName} (@${cleanHandle}) via WebSocket sync`,
        'success'
      );
    } else {
      addOperator({
        name: formName.trim(),
        handle: `@${cleanHandle}`,
        role: formRole,
        email: opEmail,
        password: opPassword,
        pin: formPin,
        status: formStatus,
        notes: formNotes.trim(),
      });
      showToast(
        `Added ${formRole} operator: ${formName} (@${cleanHandle})`,
        'success'
      );
    }

    setIsAddEditModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deletingOperator) {
      deleteOperator(deletingOperator.id);
      showToast(
        `Removed operator credentials for ${deletingOperator.name}`,
        'info'
      );
      setDeletingOperator(null);
    }
  };

  // Avatar helper
  const getAvatarStyles = (op: OperatorCredential) => {
    if (op.avatarColor === 'teal' || op.role === 'ADMIN') {
      return 'bg-[#E6F8F6] border-[#99E6DE] text-[#0D9488]';
    }
    if (op.avatarColor === 'gold' || op.role === 'CASHIER') {
      return 'bg-[#FEF6E7] border-[#FADCA8] text-[#D97706]';
    }
    if (op.avatarColor === 'indigo' || op.role === 'MANAGER') {
      return 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]';
    }
    return 'bg-zinc-100 border-zinc-200 text-zinc-700';
  };

  const getRoleBadgeStyles = (role: OperatorRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-[#E6F8F6] text-[#0D9488] border-[#99E6DE]/60';
      case 'MANAGER':
        return 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]/60';
      case 'CASHIER':
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <AdminLayout
      title="Staff & Terminal Operators"
      subtitle="Manage cashier logins, PIN security & role authorizations for POS terminals"
      mainClassName="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28"
    >
      {/* Top Banner Card (matching exact user screenshot) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Info with Teal Icon */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#E6F8F6] text-[#0D9488] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Users className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-[#27140B] tracking-tight">
                Staff &amp; Terminal Operators
              </h1>
              {/* WebSocket live status chip */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isWsConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
                title={isWsConnected ? 'WebSocket live real-time sync connected' : 'Connecting to WebSocket...'}
              >
                <Radio className={`w-3 h-3 ${isWsConnected ? 'animate-pulse text-emerald-600' : 'text-amber-500'}`} />
                <span>{isWsConnected ? 'WebSocket Live' : 'Syncing'}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">
              Manage cashier logins, PIN security &amp; role authorizations for POS terminals
            </p>
          </div>
        </div>

        {/* Right Filter Tabs (matching user screenshot pills) */}
        <div className="inline-flex items-center p-1 bg-zinc-100/90 rounded-full border border-zinc-200/80 self-start lg:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CASHIER')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'CASHIER'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Cashiers ({counts.cashiers})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MANAGER')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'MANAGER'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Managers ({counts.managers})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ADMIN')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ADMIN'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Admins ({counts.admins})
          </button>
        </div>
      </div>

      {/* Operator Cards Grid (matching exact user screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {filteredOperators.map((op) => {
          const isPinRevealed = !!revealedPins[op.id];
          const initialLetter = op.name ? op.name.charAt(0).toUpperCase() : '?';

          return (
            <div
              key={op.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between hover:shadow-md ${
                op.status === 'Blocked'
                  ? 'border-rose-200 bg-rose-50/20 shadow-rose-100/50'
                  : 'border-zinc-200/90 shadow-sm'
              }`}
            >
              {/* Top Row: Avatar, Name, Handle, Edit/Delete */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Circle Avatar with Initial */}
                    <div
                      className={`w-11 h-11 rounded-full border flex items-center justify-center font-bold text-base shrink-0 select-none ${getAvatarStyles(
                        op
                      )}`}
                    >
                      {initialLetter}
                    </div>

                    {/* Name & Handle & optional Email */}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-zinc-900 truncate leading-tight">
                        {op.name}
                      </h3>
                      <p className="text-xs font-medium text-zinc-400 mt-0.5 truncate">
                        {op.handle}
                      </p>
                      {op.email && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium mt-0.5 truncate" title={op.email}>
                          <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{op.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(op)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Credentials & PIN"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingOperator(op)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Operator"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Role Badge & Real-Time Status Toggle */}
                <div className="flex items-center justify-between mt-5">
                  {/* Role Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase border ${getRoleBadgeStyles(
                      op.role
                    )}`}
                  >
                    {op.role}
                  </span>

                  {/* Real-time Status Toggle Pill */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(op)}
                    className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                      op.status === 'Active'
                        ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                        : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 animate-pulse'
                    }`}
                    title={
                      op.status === 'Active'
                        ? 'Click to Block operator instantly via WebSocket'
                        : 'Click to Unblock operator instantly via WebSocket'
                    }
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        op.status === 'Active' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                      }`}
                    />
                    <span>{op.status === 'Active' ? 'Active' : 'Blocked'}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Row: PIN & Password & View Toggle */}
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                {/* Left: PIN and optional Password for Admin/Manager */}
                <div className="flex flex-col gap-1 text-zinc-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                    <span className="font-semibold text-zinc-700 text-[11px]">PIN:</span>
                    <span
                      className={`font-mono text-xs tracking-wider ${
                        isPinRevealed ? 'font-bold text-zinc-900 bg-zinc-100 px-1 py-0.5 rounded' : 'text-zinc-500 font-black'
                      }`}
                    >
                      {isPinRevealed ? op.pin : '••••'}
                    </span>
                  </div>

                  {op.password && (
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                      <span className="font-semibold text-zinc-700 text-[11px]">PWD:</span>
                      <span
                        className={`font-mono text-xs tracking-wider ${
                          isPinRevealed ? 'font-bold text-zinc-900 bg-zinc-100 px-1 py-0.5 rounded' : 'text-zinc-500 font-black'
                        }`}
                      >
                        {isPinRevealed ? op.password : '••••••••'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Eye View/Hide toggle */}
                <button
                  type="button"
                  onClick={() => togglePinReveal(op.id)}
                  className="inline-flex items-center gap-1 font-bold text-xs text-[#0D9488] hover:text-[#0F766E] transition-colors cursor-pointer select-none self-end"
                >
                  {isPinRevealed ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredOperators.length === 0 && (
        <div className="mt-12 text-center py-12 bg-white rounded-2xl border border-zinc-200/80 p-8 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-800">No Operators Found</h3>
          <p className="text-xs text-zinc-500 mt-1">
            No operators match the selected "{activeTab}" filter.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition cursor-pointer"
          >
            Add Staff Member
          </button>
        </div>
      )}

      {/* Floating Bottom-Center Action Button (matching exact user screenshot) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-[#221F1F] text-white rounded-full pl-6 pr-2 py-2 flex items-center gap-3.5 shadow-2xl hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group border border-zinc-800"
        >
          <span className="text-sm font-bold tracking-wide">Add Staff Member</span>
          <div className="w-8 h-8 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-xs group-hover:bg-[#0F766E] transition-colors">
            <Plus className="w-4 h-4 stroke-[2.6]" />
          </div>
        </button>
      </div>

      {/* Add / Edit Operator Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F8F6] text-[#0D9488] flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-900 leading-tight">
                    {editingOperator ? 'Edit Operator Credentials' : 'Add Staff Member'}
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium">
                    Configure role authorization, handle &amp; 4-digit terminal PIN
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOperator} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Role Authorization
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ADMIN', 'MANAGER', 'CASHIER'] as OperatorRole[]).map((role) => {
                    const isSelected = formRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormRole(role)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? role === 'ADMIN'
                              ? 'bg-[#E6F8F6] border-[#0D9488] text-[#0D9488] shadow-xs'
                              : role === 'MANAGER'
                              ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] shadow-xs'
                              : 'bg-zinc-900 border-black text-white shadow-xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <span>{role}</span>
                        <span className="text-[10px] font-normal opacity-80">
                          {role === 'ADMIN'
                            ? 'Full Control'
                            : role === 'MANAGER'
                            ? 'Supervisor'
                            : 'POS Cashier'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name & Handle in 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Chaminda Silva"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Handle / Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formHandle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormHandle(val.startsWith('@') ? val : `@${val}`);
                    }}
                    placeholder="@admin or @cashier1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Email & Password for Admin & Manager */}
              {(formRole === 'ADMIN' || formRole === 'MANAGER') && (
                <div className="p-3.5 bg-zinc-50/90 rounded-2xl border border-zinc-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${formRole === 'ADMIN' ? 'bg-[#0D9488]' : 'bg-[#4F46E5]'}`} />
                    <span className="text-xs font-black text-zinc-800 uppercase tracking-wide">
                      {formRole} Portal Credentials
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      (Used for login)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder={formRole === 'ADMIN' ? 'admin@chillandchoc.lk' : 'manager@chillchoc.lk'}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:border-zinc-900 focus:outline-none bg-white"
                        />
                        <Mail className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                        Portal Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={formShowPassword ? 'text' : 'password'}
                          required
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="e.g. admin123"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:border-zinc-900 focus:outline-none bg-white"
                        />
                        <Lock className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <button
                          type="button"
                          onClick={() => setFormShowPassword(!formShowPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5"
                        >
                          {formShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4-Digit PIN & Status Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    4-Digit Security PIN <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={formShowPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={4}
                      required
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="e.g. 1234"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 text-sm font-mono font-bold tracking-widest focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPin(!formShowPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5"
                    >
                      {formShowPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Status Authorization
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus('Active')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        formStatus === 'Active'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-xs'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('Blocked')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        formStatus === 'Blocked'
                          ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Blocked</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes / Register info */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Internal Notes / Register Details
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Primary POS Terminal Cashier • Register 01"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-medium focus:border-zinc-900 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 mt-5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingOperator ? 'Update Credentials' : 'Save Operator'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOperator && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-zinc-200 p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-zinc-900">
              Delete Operator Credentials?
            </h3>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-zinc-800">{deletingOperator.name}</span> ({deletingOperator.handle})? They will no longer be able to log into any POS terminal.
            </p>
            <div className="flex items-center justify-center gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeletingOperator(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
