import { UserRole, ApiResponse } from '@reconcilo/shared';
import { CognitoAdapter } from '../adapters/cognito.adapter.js';

export interface AuthContext {
  userId: string;
  role: UserRole;
  storeId?: string | null;
}

/**
 * Validates request authorization and enforces role checks per AGENTS.md §7 and rules.md RULE-048-051.
 */
export async function authorizeRequest(
  event: any,
  allowedRoles: UserRole[]
): Promise<{ authorized: boolean; context?: AuthContext; errorResponse?: any }> {
  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    event.headers?.['x-auth-token'];

  if (!authHeader) {
    return {
      authorized: false,
      errorResponse: {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' },
        } as ApiResponse<null>),
      },
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const verification = await CognitoAdapter.verifyToken(token);

  if (!verification.valid || !verification.role) {
    return {
      authorized: false,
      errorResponse: {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token is expired or invalid' },
        } as ApiResponse<null>),
      },
    };
  }

  if (!allowedRoles.includes(verification.role)) {
    return {
      authorized: false,
      errorResponse: {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `User role '${verification.role}' is not authorized for this action. Allowed: [${allowedRoles.join(', ')}]`,
          },
        } as ApiResponse<null>),
      },
    };
  }

  return {
    authorized: true,
    context: {
      userId: verification.userId!,
      role: verification.role,
      storeId: verification.storeId,
    },
  };
}
