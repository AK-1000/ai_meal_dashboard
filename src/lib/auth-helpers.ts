import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase-admin';

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'content_manager' | 'customer_support';
  user_id: string;
  created_at: string;
}

export async function verifyAdmin(req: Request): Promise<AdminUser | null> {
  try {
    // 1. Get token from Authorization header or cookie
    let token = '';
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Try parsing cookie
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        // Look for typical supabase token structure in cookie: sb-svbezdqdlugamcrsbgyt-auth-token
        const cookies = cookieHeader.split(';').map(c => c.trim());
        
        // Try sb-<project-ref>-auth-token.0 or sb-<project-ref>-auth-token
        // Or supabase-auth-token
        for (const cookie of cookies) {
          if (cookie.includes('auth-token')) {
            const eqIndex = cookie.indexOf('=');
            if (eqIndex !== -1) {
              const value = decodeURIComponent(cookie.substring(eqIndex + 1));
              try {
                // If it is stored as JSON array/object (older supabase-ssr formats)
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed[0]) {
                  token = parsed[0];
                } else if (parsed.access_token) {
                  token = parsed.access_token;
                }
              } catch (e) {
                // It might be the raw token value or chunked
                token = value;
              }
            }
          }
        }
      }
    }

    if (!token) {
      return null;
    }

    // 2. Retrieve user from Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return null;
    }

    // 3. Check admin_users table
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return null;
    }

    return adminUser as AdminUser;
  } catch (err) {
    console.error('Error verifying admin:', err);
    return null;
  }
}

export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: any = {},
  req?: Request
) {
  try {
    const ipAddress = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || '';
    const userAgent = req?.headers.get('user-agent') || '';

    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}

// Wrapper pattern for API routes
export function withAdminAuth(
  handler: (req: NextRequest, admin: AdminUser) => Promise<NextResponse>,
  allowedRoles: Array<'super_admin' | 'content_manager' | 'customer_support'> = ['super_admin', 'content_manager', 'customer_support']
) {
  return async (req: NextRequest) => {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    if (!allowedRoles.includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    return handler(req, admin);
  };
}
