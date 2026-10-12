/**
 * paymentService.ts
 * Central service for the GroundWork Pro manual payment system.
 * Handles request creation, status polling, screenshot upload, and Pro activation.
 * Architecture is forward-compatible with future automated gateways.
 */

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PAYMENT_METHODS = {
  telebirr: {
    id: 'telebirr',
    label: 'Telebirr',
    accountHolder: 'Barok Mulatu',
    phoneNumber: '+251935008069',
    instructions: [
      'Open your Telebirr app',
      'Select "Send Money"',
      'Enter the phone number above',
      'Enter the exact amount',
      'In the transfer note, write your reference code',
      'Complete the transfer and screenshot the confirmation',
    ],
  },
  cbe: {
    id: 'cbe',
    label: 'CBE Transfer',
    accountHolder: 'Barok Mulatu',
    accountNumber: '1000750283784',
    instructions: [
      'Open your CBE Birr app or visit any CBE branch',
      'Select "Transfer"',
      'Enter the account number above',
      'Enter the exact amount',
      'In the reference/description field, write your reference code',
      'Complete the transfer and screenshot the confirmation',
    ],
  },
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const PLANS = {
  pro_1month: { id: 'pro_1month', label: 'Monthly', price: 49.99, currency: 'ETB', durationDays: 30 },
  pro_1year:  { id: 'pro_1year',  label: 'Yearly',  price: 499.99, currency: 'ETB', durationDays: 365 },
} as const;

export type PlanId = keyof typeof PLANS;

export type PaymentStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface PaymentRequest {
  id: string;
  userId: string;
  referenceCode: string;
  paymentMethod: PaymentMethod;
  plan: PlanId;
  amount: number;
  transactionId?: string;
  paymentNote?: string;
  screenshotUrl?: string;
  status: PaymentStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Reference Code Generator ─────────────────────────────────────────────────

const generateReferenceCode = (): string => {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `GW-PRO-${num}`;
};

// ─── Create Payment Request ───────────────────────────────────────────────────

export const createPaymentRequest = async (
  method: PaymentMethod,
  plan: PlanId,
): Promise<{ data: PaymentRequest | null; error: string | null }> => {
  const { session } = useAuthStore.getState();
  if (!session?.user?.id) return { data: null, error: 'Not authenticated' };

  const userId = session.user.id;

  // Block duplicate active requests
  const existing = await getActivePaymentRequest();
  if (existing.data) {
    return { data: null, error: 'You already have a pending payment request. Please wait for it to be reviewed.' };
  }

  const id = `pr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const referenceCode = generateReferenceCode();
  const amount = PLANS[plan].price;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      id,
      user_id: userId,
      reference_code: referenceCode,
      payment_method: method,
      plan,
      amount,
      status: 'pending',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  // Update latest_payment_request_id on profile
  await supabase.from('profiles').update({ latest_payment_request_id: id }).eq('id', userId);

  return { data: mapRequest(data), error: null };
};

// ─── Submit Payment Proof ─────────────────────────────────────────────────────

export const submitPaymentProof = async (
  requestId: string,
  transactionId: string,
  paymentNote: string,
  screenshotUri: string | null,
): Promise<{ error: string | null }> => {
  const { session } = useAuthStore.getState();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  let screenshotUrl: string | null = null;

  if (screenshotUri) {
    const uploadResult = await uploadScreenshot(session.user.id, requestId, screenshotUri);
    if (uploadResult.error) return { error: uploadResult.error };
    screenshotUrl = uploadResult.url;
  }

  const { error } = await supabase
    .from('payment_requests')
    .update({
      transaction_id: transactionId.trim(),
      payment_note: paymentNote.trim() || null,
      screenshot_url: screenshotUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('user_id', session.user.id);

  if (error) return { error: error.message };
  return { error: null };
};

// ─── Upload Screenshot ────────────────────────────────────────────────────────

const uploadScreenshot = async (
  userId: string,
  requestId: string,
  uri: string,
): Promise<{ url: string | null; error: string | null }> => {
  try {
    // Read file
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return { url: null, error: 'File not found' };

    // Check size (5MB max)
    if ((fileInfo as any).size > 5 * 1024 * 1024) {
      return { url: null, error: 'Image is too large. Maximum size is 5MB.' };
    }

    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const path = `${userId}/${requestId}.${ext}`;

    let fileData;
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      fileData = await response.blob();
    } else {
      fileData = {
        uri,
        type: mimeType,
        name: `${requestId}.${ext}`,
      } as any;
    }

    const { error: uploadError } = await supabase.storage.from('payment-screenshots').upload(path, fileData, {
      contentType: mimeType,
      upsert: true,
    });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    return { url: path, error: null };
  } catch (e: any) {
    return { url: null, error: e?.message || 'Upload failed' };
  }
};

// ─── Get Active Request ───────────────────────────────────────────────────────

export const getActivePaymentRequest = async (): Promise<{
  data: PaymentRequest | null;
  error: string | null;
}> => {
  const { session } = useAuthStore.getState();
  if (!session?.user?.id) return { data: null, error: null };

  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', session.user.id)
    .in('status', ['pending', 'under_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: mapRequest(data), error: null };
};

// ─── Get Latest Request (any status) ─────────────────────────────────────────

export const getLatestPaymentRequest = async (): Promise<{
  data: PaymentRequest | null;
  error: string | null;
}> => {
  const { session } = useAuthStore.getState();
  if (!session?.user?.id) return { data: null, error: null };

  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: mapRequest(data), error: null };
};

// ─── Get Payment History ──────────────────────────────────────────────────────

export const getPaymentHistory = async (): Promise<PaymentRequest[]> => {
  const { session } = useAuthStore.getState();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapRequest);
};

// ─── Status Labels ────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<PaymentStatus, { label: string; message: string; color: string }> = {
  pending: {
    label: 'Pending Verification',
    message: 'Your payment request has been received and is waiting for review.',
    color: '#FF9500',
  },
  under_review: {
    label: 'Under Review',
    message: 'A team member is actively reviewing your payment.',
    color: '#007AFF',
  },
  approved: {
    label: 'Approved',
    message: 'Your payment has been verified. Pro is now active on your account.',
    color: '#34C759',
  },
  rejected: {
    label: 'Rejected',
    message: 'Your payment could not be verified. Please try again or contact support.',
    color: '#FF3B30',
  },
};

// ─── Map DB Row → Interface ───────────────────────────────────────────────────

const mapRequest = (row: any): PaymentRequest => ({
  id: row.id,
  userId: row.user_id,
  referenceCode: row.reference_code,
  paymentMethod: row.payment_method,
  plan: row.plan,
  amount: row.amount,
  transactionId: row.transaction_id ?? undefined,
  paymentNote: row.payment_note ?? undefined,
  screenshotUrl: row.screenshot_url ?? undefined,
  status: row.status,
  rejectionReason: row.rejection_reason ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

