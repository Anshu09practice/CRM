/**
 * ISO 20022 Compliance Utilities
 * Provides structured financial message formatting, unique transaction references,
 * and ISO 4217 currency code support for billing operations.
 */

// ISO 4217 Currency Codes used in this application
export interface ISO4217Amount {
  value: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
}

// ISO 20022 Unique End-to-End Transaction Reference (UETR)
// Format: UUID v4 as per ISO 20022 Universal End-to-End Transaction Reference
export function generateUETR(): string {
  return crypto.randomUUID();
}

// ISO 20022 Structured Party Identification
export interface PartyIdentification {
  name: string;
  postalAddress?: {
    streetName?: string;
    townName?: string;
    country: string; // ISO 3166-1 alpha-2
  };
  contactDetails?: {
    phoneNumber?: string;
  };
  identification?: {
    organisationId?: string; // LEI or business registration
    privateId?: string;     // National ID or customer reference
  };
}

// ISO 20022 Structured Remittance Information (bill reference)
export interface RemittanceInformation {
  unstructured?: string; // Free-form notes
  structured?: {
    referredDocumentType: 'CINV' | 'CREN' | 'DEBN'; // Commercial Invoice | Credit Note | Debit Note
    referredDocumentNumber: string;  // Bill number
    referredDocumentDate: string;    // ISO 8601 date
  };
}

// ISO 20022 Payment Status (maps to pacs.002 statuses)
export type ISO20022PaymentStatus =
  | 'ACCP'  // Accepted
  | 'ACSP'  // AcceptedSettlementInProcess
  | 'ACSC'  // AcceptedSettlementCompleted
  | 'PDNG'  // Pending
  | 'RJCT'; // Rejected

// Map internal payment statuses to ISO 20022
export function toISO20022Status(status: string): ISO20022PaymentStatus {
  switch (status) {
    case 'paid': return 'ACSC';
    case 'partial': return 'ACSP';
    case 'pending': return 'PDNG';
    case 'overdue': return 'PDNG';
    default: return 'PDNG';
  }
}

// Map ISO 20022 status back to internal
export function fromISO20022Status(status: ISO20022PaymentStatus): string {
  switch (status) {
    case 'ACSC': return 'paid';
    case 'ACSP': return 'partial';
    case 'ACCP': return 'pending';
    case 'PDNG': return 'pending';
    case 'RJCT': return 'overdue';
    default: return 'pending';
  }
}

// ISO 20022 compliant financial message structure (simplified pain.001-like)
export interface ISO20022PaymentMessage {
  messageId: string;          // Unique message identifier
  creationDateTime: string;   // ISO 8601
  transactionReference: string; // UETR
  paymentInformation: {
    debtorParty: PartyIdentification;     // Customer (who pays)
    creditorParty: PartyIdentification;   // Business (who receives)
    instructedAmount: ISO4217Amount;
    remittanceInformation: RemittanceInformation;
    paymentStatus: ISO20022PaymentStatus;
  };
}

// Create an ISO 20022 compliant payment message from a bill
export function createPaymentMessage(bill: {
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  payment_status: string;
  bill_date: string;
  notes: string;
}, businessName: string = 'Jalan Jyothi'): ISO20022PaymentMessage {
  return {
    messageId: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    creationDateTime: new Date().toISOString(),
    transactionReference: generateUETR(),
    paymentInformation: {
      debtorParty: {
        name: bill.customer_name,
        contactDetails: {
          phoneNumber: bill.customer_phone
        },
        postalAddress: bill.customer_address ? {
          streetName: bill.customer_address,
          country: 'IN'
        } : undefined
      },
      creditorParty: {
        name: businessName,
        postalAddress: {
          country: 'IN'
        }
      },
      instructedAmount: {
        value: bill.total,
        currency: 'INR'
      },
      remittanceInformation: {
        unstructured: bill.notes || undefined,
        structured: {
          referredDocumentType: 'CINV',
          referredDocumentNumber: bill.bill_number,
          referredDocumentDate: bill.bill_date
        }
      },
      paymentStatus: toISO20022Status(bill.payment_status)
    }
  };
}

// Format amount with ISO 4217 currency for display
export function formatISO4217(amount: ISO4217Amount): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: amount.currency
  }).format(amount.value);
}

// Validate ISO 20022 message structure
export function validatePaymentMessage(msg: ISO20022PaymentMessage): string[] {
  const errors: string[] = [];
  if (!msg.messageId) errors.push('messageId is required');
  if (!msg.transactionReference) errors.push('transactionReference (UETR) is required');
  if (!msg.creationDateTime) errors.push('creationDateTime is required');
  if (!msg.paymentInformation.debtorParty.name) errors.push('debtorParty.name is required');
  if (!msg.paymentInformation.creditorParty.name) errors.push('creditorParty.name is required');
  if (msg.paymentInformation.instructedAmount.value <= 0) errors.push('instructedAmount must be positive');
  if (!msg.paymentInformation.remittanceInformation.structured?.referredDocumentNumber) {
    errors.push('structured remittance document number is required');
  }
  return errors;
}
