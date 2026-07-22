export interface DbUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  profile_picture?: string;
  subscription_status?: string;
  subscription_tier?: string;
  plan_end_date?: string;
  height?: number;
  weight?: number;
  target_weight?: number;
  gender?: string;
  age?: number;
  activity_level?: string;
  dietary_preference?: string;
  allergies?: string[];
  health_conditions?: string[];
  country?: string;
  created_at: string;
  updated_at?: string;
  phone?: string;
  last_login?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'content_manager' | 'customer_support';
  user_id: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  admin?: {
    email: string;
    role: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  apple_product_id?: string;
  android_product_id?: string;
  is_active: boolean;
  rank: number;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id?: string;
  status: string; // active, canceled, expired
  start_date: string;
  end_date: string;
  billing_cycle: 'monthly' | 'yearly';
  platform: 'ios' | 'android' | 'manual';
  apple_original_transaction_id?: string;
  android_purchase_token?: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    name?: string;
  };
}

export interface PaymentHistory {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'refunded';
  platform: 'ios' | 'android';
  transaction_id: string;
  promo_code_id?: string;
  created_at: string;
  user?: {
    email: string;
    name?: string;
  };
}

export interface Sponsor {
  id: string;
  name: string;
  contact_email: string;
  discount_percentage: number;
  commission_percentage: number;
  is_active: boolean;
  code_prefix: string;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  sponsor_id?: string;
  discount_percentage: number;
  is_active: boolean;
  expires_at?: string;
  code_type: 'referral' | 'promo';
  max_uses?: number;
  never_expires: boolean;
  total_uses: number;
  unique_users_count: number;
  created_at: string;
  sponsor?: {
    name: string;
  };
}

export interface ReferralTracking {
  id: string;
  sponsor_id: string;
  referral_code_id: string;
  referred_user_id: string;
  referral_type: 'signup' | 'payment';
  payment_status: 'unpaid' | 'paid';
  paid_in_payment_id?: string;
  commission_amount: number;
  original_payment_amount?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  sponsors?: {
    id: string;
    name: string;
    code_prefix: string;
    commission_percentage: number;
  };
  promo_codes?: {
    id: string;
    code: string;
    discount_percentage: number;
  };
  users?: {
    id: string;
    email: string;
    name?: string;
    created_at: string;
  };
}

export interface SponsorPayment {
  id: string;
  sponsor_id: string;
  amount: number;
  currency: string;
  referrals_covered: number;
  payment_method: 'manual' | 'bank_transfer' | 'other';
  notes?: string;
  paid_by_admin_id?: string;
  period_start?: string;
  period_end?: string;
  created_at: string;
  sponsors?: {
    id: string;
    name: string;
    code_prefix: string;
    contact_email: string;
  };
  admin_users?: {
    id: string;
    email: string;
  };
}

export interface AppLog {
  id: string;
  user_id?: string;
  user_email?: string;
  screen_name?: string;
  error_message: string;
  error_details?: string;
  stack_trace?: string;
  device_info?: any;
  extra_data?: any;
  severity: 'info' | 'warning' | 'error' | 'success';
  log_category: 'application' | 'warning' | 'error' | 'user_activity';
  source: 'flutter' | 'dashboard' | 'backend';
  created_at: string;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: string;
  ingredients: string[];
  steps: string[];
  image_url?: string;
  created_at: string;
}

