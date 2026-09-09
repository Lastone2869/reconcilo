import { UserRole } from '@reconcilo/shared';

/**
 * Cognito Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: Amazon Cognito
 * -----------------------------------
 * 1. Open AWS Console -> Cognito -> Create user pool
 * 2. Configure email sign-in, create Groups: STORE_STAFF, STORE_MANAGER, ADMIN, SUPPLIER
 * 3. Add App Client for public web app (No client secret)
 * 4. Replace this stub implementation with `@aws-sdk/client-cognito-identity-provider`
 */

export interface CognitoUserSession {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  store_id?: string | null;
  token: string;
}

export class CognitoAdapter {
  /**
   * Authenticates user credentials and returns session tokens with role.
   * // TODO: Replace stub with real AWS SDK InitiateAuthCommand
   */
  static async authenticateUser(
    email: string,
    password?: string
  ): Promise<CognitoUserSession | null> {
    const roleMap: Record<string, { role: UserRole; store_id?: string | null }> = {
      'staff@reconcilo.com': { role: UserRole.STORE_STAFF, store_id: 'store-001' },
      'manager@reconcilo.com': { role: UserRole.STORE_MANAGER, store_id: 'store-001' },
      'admin@reconcilo.com': { role: UserRole.ADMIN, store_id: null },
      'supplier@reconcilo.com': { role: UserRole.SUPPLIER, store_id: null },
    };

    const matched = roleMap[email.toLowerCase()] || {
      role: UserRole.STORE_STAFF,
      store_id: 'store-001',
    };

    return {
      sub: `cognito-sub-${email.split('@')[0]}`,
      email,
      name: email.split('@')[0].toUpperCase(),
      role: matched.role,
      store_id: matched.store_id,
      token: `stub-jwt-token-${Date.now()}-${matched.role}`,
    };
  }

  /**
   * Verifies incoming JWT token and extracts user details + role.
   * // TODO: Replace stub with real Cognito JWT verifier library (aws-jwt-verify)
   */
  static async verifyToken(token: string): Promise<{
    valid: boolean;
    role?: UserRole;
    userId?: string;
    storeId?: string | null;
  }> {
    if (!token || !token.startsWith('stub-jwt-token')) {
      return { valid: false };
    }

    let role = UserRole.STORE_STAFF;
    if (token.includes(UserRole.ADMIN)) role = UserRole.ADMIN;
    else if (token.includes(UserRole.STORE_MANAGER)) role = UserRole.STORE_MANAGER;
    else if (token.includes(UserRole.SUPPLIER)) role = UserRole.SUPPLIER;

    return {
      valid: true,
      role,
      userId: `user-${role.toLowerCase()}`,
      storeId: role === UserRole.ADMIN || role === UserRole.SUPPLIER ? null : 'store-001',
    };
  }
}
