// Module 12 — Payment Integration.
// Shapes mirror the backend Payment.toJSONFor(actor) output: `_id` alias,
// decimals as numbers. Fields the backend strips for students are optional.

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentKind = "stipend" | "bonus";
export type PaymentProviderName = "sandbox" | "stripe";
export type PayoutMethodType = "bank_transfer" | "jazzcash" | "easypaisa" | "paypal";
export type BudgetType = "fixed" | "hourly" | "unpaid";

export interface PaymentEvent {
  _id: string;
  id: string;
  paymentId: string;
  fromStatus: PaymentStatus | null;
  toStatus: PaymentStatus;
  source: "user" | "webhook" | "system";
  actorUserId: string | null;
  actorRole: string | null;
  note: string | null;
  createdAt: string;
}

export interface PaymentPermissions {
  canCheckout: boolean;
  canConfirmSandbox: boolean;
  canCancel: boolean;
  canRefund: boolean;
  canViewReceipt: boolean;
}

export interface Payment {
  _id: string;
  id: string;
  reference: string;
  progressId: string | null;
  applicationId: string | null;
  taskId: string | null;
  studentId: string | null;
  companyId: string | null;
  studentName: string | null;
  companyName: string | null;
  taskTitle: string | null;
  kind: PaymentKind;
  description: string | null;
  amount: number;
  currency: string;
  platformFee: number;
  netAmount: number;
  feePercent: number;
  status: PaymentStatus;
  provider: PaymentProviderName | null;
  /** Company / admin only. */
  checkoutUrl?: string | null;
  providerPaymentId?: string | null;
  providerRefundId?: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  failureReason: string | null;
  refundReason: string | null;
  refundedByUserId: string | null;
  processingAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  events?: PaymentEvent[];
  permissions: PaymentPermissions;
}

export interface Compensation {
  budgetType: BudgetType;
  currency: string | null;
  agreedAmount: number | null;
  hourlyRate: number | null;
  hoursLogged: number;
  paidToDate: number;
  committedStipend: number;
  outstanding: number | null;
  feePercent: number;
}

export interface InternshipPayments {
  progressId: string;
  progressStatus: string;
  studentName: string | null;
  companyName: string | null;
  taskTitle: string | null;
  payments: Payment[];
  compensation: Compensation;
  payoutMethodOnFile: boolean;
  hasOpenPayment: boolean;
  provider: PaymentProviderName;
  permissions: { canPay: boolean; canRefund: boolean };
}

export interface CreatePaymentData {
  amount: number;
  kind?: PaymentKind;
  description?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  provider: PaymentProviderName;
  payment: Payment;
}

export interface SandboxCardData {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  cardholderName: string;
}

export interface PayoutMethod {
  _id: string;
  id: string;
  studentId: string;
  method: PayoutMethodType;
  methodLabel: string;
  accountTitle: string;
  accountMasked: string;
  bankName: string | null;
  updatedAt: string;
}

export interface PayoutMethodData {
  method: PayoutMethodType;
  accountTitle: string;
  /** The full account / wallet number or PayPal email — sent once, never stored. */
  account: string;
  bankName?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export type StatusCounts = Record<PaymentStatus, number>;

export interface StudentPaymentSummary {
  currency: string | null;
  totalReceivedNet: number;
  totalRefunded: number;
  pending: number;
  byCurrency: Array<{ currency: string; receivedNet: number; refunded: number; pending: number; count: number }>;
  byStatus: StatusCounts;
}

export interface CompanyPaymentSummary {
  currency: string | null;
  totalPaid: number;
  totalFees: number;
  refunded: number;
  open: number;
  byCurrency: Array<{ currency: string; paid: number; fees: number; refunded: number; open: number; count: number }>;
  byStatus: StatusCounts;
}

export interface AdminPaymentSummary {
  currency: string | null;
  volume: number;
  fees: number;
  refunded: number;
  open: number;
  byStatus: StatusCounts;
  byProvider: Record<string, number>;
  byCurrency: Array<{ currency: string; volume: number; fees: number; refunded: number; count: number }>;
  activeProvider: PaymentProviderName;
  sandboxEnabled: boolean;
}

export interface PaymentList<S> {
  records: Payment[];
  pagination: PaginationInfo;
  summary: S;
}

export interface StudentPaymentList extends PaymentList<StudentPaymentSummary> {
  payoutMethod: PayoutMethod | null;
}

export interface PaymentReceipt {
  id: string;
  reference: string;
  status: PaymentStatus;
  kind: PaymentKind;
  description: string | null;
  student: { id: string | null; name: string | null };
  company: { id: string | null; name: string | null };
  task: { id: string | null; title: string | null };
  progressId: string | null;
  currency: string;
  amount: number;
  feePercent: number;
  platformFee: number;
  netAmount: number;
  provider: PaymentProviderName | null;
  card: string | null;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  issuedAt: string;
}

export interface PaymentListFilters {
  status?: PaymentStatus | "";
  provider?: PaymentProviderName | "";
  page?: number;
  limit?: number;
}
