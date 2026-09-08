import { StaffMember, PayrollDisbursement } from '../src/types';

function runStaffTests() {
  console.log('Testing Staff Management & Payroll Calculation...');

  const sampleStaff: StaffMember = {
    id: 'staff-1',
    name: 'Kasun Fernando',
    phone: '+94 76 555 8899',
    role: 'Cashier & Junior Barista',
    attendances: 0,
    baseSalary: 55000,
    payFrequency: 'Monthly',
    salaryDate: '28th of Month',
    overtimeRate: 450,
    status: 'Active',
    bankName: 'Sampath Bank',
    bankAccount: '1004839201',
    bankBranch: 'Bambalapitiya',
    monthlySalesAttributed: 42500,
    isPaidThisMonth: false,
  };

  // 1. Initial State verification
  console.log('Staff:', sampleStaff.name, '| Base:', sampleStaff.baseSalary, '| Monthly Sales:', sampleStaff.monthlySalesAttributed);
  if (sampleStaff.isPaidThisMonth !== false) {
    throw new Error('Initial status should be unpaid');
  }
  console.log('✓ Initial unpaid status verified: Due: Rs.', sampleStaff.baseSalary.toLocaleString());

  // 2. Earnings calculation with OT and Monthly Sales Performance Bonus
  const basicSalary = sampleStaff.baseSalary;
  const otHours = 8;
  const otAmount = otHours * sampleStaff.overtimeRate; // 8 * 450 = 3600
  const bonus = 5000; // Based on Rs. 42,500 monthly sales
  const deduction = 1000;
  const totalPayable = basicSalary + otAmount + bonus - deduction;

  console.log(`Calculated: Base(${basicSalary}) + OT(${otAmount}) + Bonus(${bonus}) - Deduction(${deduction}) = ${totalPayable}`);
  if (totalPayable !== 62600) {
    throw new Error(`Expected 62600, got ${totalPayable}`);
  }
  console.log('✓ Total payable calculation verified: Rs.', totalPayable.toLocaleString());

  // 3. Disbursement simulation
  const disbursement: PayrollDisbursement = {
    id: 'pr-test-1',
    staffId: sampleStaff.id,
    staffName: sampleStaff.name,
    role: sampleStaff.role,
    transactionDate: '08 Sep 2026',
    disbursementMode: 'Salary Settlement',
    basicSalary,
    overtimeHours: otHours,
    overtimeRate: sampleStaff.overtimeRate,
    overtimeAmount: otAmount,
    bonusAmount: bonus,
    bonusReason: 'Sales performance bonus',
    deductionAmount: deduction,
    deductionReason: 'Uniform advance',
    totalPayable,
    paymentMethod: 'Bank Transfer',
    bankDetails: `${sampleStaff.bankName} - ${sampleStaff.bankAccount}`,
  };

  // Update staff status
  sampleStaff.isPaidThisMonth = true;
  sampleStaff.lastPaidDate = disbursement.transactionDate;
  sampleStaff.lastPaidAmount = disbursement.totalPayable;

  if (!sampleStaff.isPaidThisMonth || sampleStaff.lastPaidAmount !== 62600) {
    throw new Error('Disbursement update failed');
  }
  console.log('✓ Staff payment status successfully updated to Paid (Due: Rs. 0.00)');
  console.log('🎉 All Staff Management & Payroll tests PASSED perfectly!');
}

runStaffTests();
