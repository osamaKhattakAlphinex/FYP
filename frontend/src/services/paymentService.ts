import api from "@/lib/api";
import type {
  AdminPaymentSummary,
  CheckoutResult,
  CompanyPaymentSummary,
  CreatePaymentData,
  InternshipPayments,
  Payment,
  PaymentList,
  PaymentListFilters,
  PaymentReceipt,
  PaymentStatus,
  PayoutMethod,
  PayoutMethodData,
  PayoutMethodType,
  SandboxCardData,
  StudentPaymentList,
} from "@/types/payment.types";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Awaiting checkout",
  processing: "Processing",
  succeeded: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
];

export const PAYOUT_METHOD_LABELS: Record<PayoutMethodType, string> = {
  bank_transfer: "Bank transfer",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  paypal: "PayPal",
};

/** Stripe's published test cards, which the sandbox mirrors. */
export const SANDBOX_TEST_CARDS = [
  { number: "4242 4242 4242 4242", outcome: "Succeeds" },
  { number: "4000 0000 0000 0002", outcome: "Declined" },
  { number: "4000 0000 0000 9995", outcome: "Insufficient funds" },
];

/** "USD 1,234.50" — amounts are always shown with their currency. */
export const formatMoney = (amount: number | null | undefined, currency?: string | null): string => {
  if (amount == null) return "—";
  const value = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${value}` : value;
};

/** Fee preview for the create form; mirrors Payment.computeFee (half-up to the cent). */
export const previewFee = (amount: number, percent: number) => {
  const cents = Math.round(amount * 100);
  const pct = Math.min(100, Math.max(0, percent || 0));
  const fee = Math.min(cents, Math.max(0, Math.floor((cents * pct) / 100 + 0.5 + 1e-9)));
  return { platformFee: fee / 100, netAmount: (cents - fee) / 100 };
};

const listQuery = (filters: PaymentListFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.provider) params.set("provider", filters.provider);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));
  return params.toString();
};

export const paymentService = {
  async getForProgress(progressId: string): Promise<InternshipPayments> {
    const response = await api.get(`/payments/progress/${progressId}`);
    return response.data.data;
  },

  async create(progressId: string, data: CreatePaymentData): Promise<Payment> {
    const response = await api.post(`/payments/progress/${progressId}`, data);
    return response.data.data;
  },

  async get(id: string): Promise<Payment> {
    const response = await api.get(`/payments/${id}`);
    return response.data.data;
  },

  async checkout(id: string): Promise<CheckoutResult> {
    const response = await api.post(`/payments/${id}/checkout`);
    return response.data.data;
  },

  /** Sandbox only. The card is sent once and never stored by the platform. */
  async confirmSandbox(id: string, card: SandboxCardData): Promise<Payment> {
    const response = await api.post(`/payments/${id}/sandbox/confirm`, card);
    return response.data.data;
  },

  async cancel(id: string, reason?: string): Promise<Payment> {
    const response = await api.post(`/payments/${id}/cancel`, reason ? { reason } : {});
    return response.data.data;
  },

  async refund(id: string, reason: string): Promise<Payment> {
    const response = await api.post(`/payments/${id}/refund`, { reason });
    return response.data.data;
  },

  async getReceipt(id: string): Promise<PaymentReceipt> {
    const response = await api.get(`/payments/${id}/receipt`);
    return response.data.data;
  },

  async listForStudent(filters?: PaymentListFilters): Promise<StudentPaymentList> {
    const response = await api.get(`/payments/student?${listQuery(filters)}`);
    return response.data.data;
  },

  async listForCompany(filters?: PaymentListFilters): Promise<PaymentList<CompanyPaymentSummary>> {
    const response = await api.get(`/payments/company?${listQuery(filters)}`);
    return response.data.data;
  },

  async listForAdmin(filters?: PaymentListFilters): Promise<PaymentList<AdminPaymentSummary>> {
    const response = await api.get(`/payments/admin?${listQuery(filters)}`);
    return response.data.data;
  },

  async getPayoutMethod(): Promise<PayoutMethod | null> {
    const response = await api.get("/payments/payout-method");
    return response.data.data;
  },

  async savePayoutMethod(data: PayoutMethodData): Promise<PayoutMethod> {
    const response = await api.put("/payments/payout-method", data);
    return response.data.data;
  },

  async deletePayoutMethod(): Promise<void> {
    await api.delete("/payments/payout-method");
  },
};
