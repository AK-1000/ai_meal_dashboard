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
  created_at: string;
  sponsor?: {
    name: string;
  };
}

export interface AppLog {
  id: string;
  user_id?: string;
  user_email?: string;
  screen_name?: string;
  error_message: string;
  error_details?: string;
  extra_data?: any;
  severity: 'info' | 'warning' | 'error' | 'success';
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
