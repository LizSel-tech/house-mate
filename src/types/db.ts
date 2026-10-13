export type UserRole = 'user' | 'artisan' | 'admin';
export type AccountStatus = 'pending_payment' | 'active' | 'suspended';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';
export type EscrowStatus = 'held' | 'released' | 'refunded';
export type OtpPurpose = 'login' | 'signup';
export type PaymentMethodType = 'mtn_momo' | 'telecel_cash' | 'bank_transfer' | 'other';
export type SignupPaymentStatus = 'pending' | 'confirmed' | 'rejected';
export type KycStatus = 'draft' | 'pending' | 'verified' | 'rejected' | 'error';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  location: string | null;
  accountStatus: AccountStatus;
  avatarUrl: string | null;
  coverUrl?: string | null;
  allowAdminChatReview?: boolean;
  adminRoleId?: string | null;
  createdBy?: string | null;
  createdAt: Date | string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ArtisanProfile {
  id: string;
  userId: string;
  trade: string;
  bio: string | null;
  serviceArea: string | null;
  verificationStatus: VerificationStatus;
  subscriptionStatus: string;
  averageRating: string | number;
  jobsCompleted: number;
  payoutType?: PayoutType | null;
  payoutBankCode?: string | null;
  payoutBankName?: string | null;
  payoutAccountNumber?: string | null;
  payoutAccountName?: string | null;
  paystackRecipientCode?: string | null;
  payoutUpdatedAt?: Date | string | null;
  createdAt: Date | string;
}

export type PayoutType = 'mobile_money' | 'ghipss';
export type PayoutStatus = 'none' | 'pending' | 'paid' | 'failed' | 'manual';

export interface PaystackTransaction {
  id: string;
  reference: string;
  purpose: string;
  userId: string | null;
  bookingId: string | null;
  amount: string | number;
  commission: string | number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  accessCode: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  paidAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Service {
  id: string;
  artisanId: string;
  title: string;
  description: string | null;
  priceAmount: string | number;
  priceUnit: string;
  isActive: boolean;
  createdAt: Date | string;
}

export interface Booking {
  id: string;
  userId: string;
  artisanId: string;
  serviceId: string | null;
  location: string | null;
  problemDescription: string | null;
  agreedPrice: string | number | null;
  status: BookingStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: string | number;
  commission: string | number;
  escrowStatus: EscrowStatus;
  paystackReference: string | null;
  payoutStatus?: PayoutStatus;
  payoutAmount?: string | number | null;
  payoutAttempts?: number;
  transferReference?: string | null;
  transferCode?: string | null;
  payoutError?: string | null;
  paidOutAt?: Date | string | null;
  createdAt: Date | string;
}

export interface Review {
  id: string;
  bookingId: string;
  userId: string;
  artisanId: string;
  rating: number;
  comment: string | null;
  createdAt: Date | string;
}

export interface OtpCode {
  id: string;
  phone: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
  createdAt: Date | string;
}

export interface PlatformSetting {
  id: string;
  commissionRate: string | number;
  subscriptionFee: string | number;
  userSignupFee: string | number;
  artisanSignupFee: string | number;
  updatedAt: Date | string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SignupPayment {
  id: string;
  userId: string;
  methodId: string | null;
  amount: string | number;
  role: UserRole;
  reference: string;
  proofUrl: string | null;
  provider: 'manual' | 'paystack';
  status: SignupPaymentStatus;
  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date | string;
}

export interface VerificationDocument {
  id: string;
  artisanId: string;
  ghanaCardUrl: string | null;
  ghanaCardNumber: string | null;
  policeReportUrl: string | null;
  residenceProofUrl: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  skillsEvidenceUrls: string[];
  status: VerificationStatus;
  reviewedById: string | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
}

export interface KycVerification {
  id: string;
  userId: string;
  artisanId: string | null;
  status: KycStatus;
  provider: string;
  providerJobId: string | null;
  providerUserId: string | null;
  ghanaCardNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  documentFrontUrl: string | null;
  documentBackUrl: string | null;
  selfieUrl: string | null;
  livenessImageUrls: string[];
  extractedFields: Record<string, unknown> | null;
  failureReason: string | null;
  providerRawResult: Record<string, unknown> | null;
  consentGrantedAt: Date | string | null;
  submittedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
