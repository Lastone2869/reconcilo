import { UserRole } from '@reconcilo/shared';
import { AuthUser, saveSession } from '../stores/auth.store.js';

const REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '275ghkpn1v68cieuvl1kdjr11g';

export interface CognitoAuthResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

function parseJwtClaims(token: string): Record<string, any> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

function mapCognitoGroupToRole(groups: string[] = []): UserRole {
  if (groups.includes('ADMIN')) return UserRole.ADMIN;
  if (groups.includes('STORE_MANAGER')) return UserRole.STORE_MANAGER;
  if (groups.includes('SUPPLIER')) return UserRole.SUPPLIER;
  return UserRole.STORE_STAFF;
}

export async function loginWithCognito(
  email: string,
  password?: string
): Promise<CognitoAuthResult> {
  // If no password or in offline fallback mode
  if (!password) {
    return {
      success: false,
      error: 'Password is required for AWS Cognito authentication.',
    };
  }

  try {
    const endpoint = `https://cognito-idp.${REGION}.amazonaws.com/`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.AuthenticationResult) {
      const errorMsg =
        data.__type === 'NotAuthorizedException'
          ? 'Invalid email or password.'
          : data.__type === 'UserNotFoundException'
          ? 'User not found in Cognito directory.'
          : data.message || 'Authentication failed. Please verify credentials.';
      return { success: false, error: errorMsg };
    }

    const idToken = data.AuthenticationResult.IdToken;
    const claims = parseJwtClaims(idToken);
    const groups: string[] = claims['cognito:groups'] || [];
    const role = mapCognitoGroupToRole(groups);

    const authUser: AuthUser = {
      user_id: claims.sub || `user-${email.split('@')[0]}`,
      email: claims.email || email,
      name: email.split('@')[0].toUpperCase(),
      role,
      store_id: role === UserRole.ADMIN || role === UserRole.SUPPLIER ? null : 'store-001',
    };

    saveSession(authUser, idToken);

    return {
      success: true,
      user: authUser,
      token: idToken,
    };
  } catch (err: any) {
    // Network error or completely offline: allow offline graceful notification
    return {
      success: false,
      error: `Network error connecting to AWS Cognito: ${err.message}`,
    };
  }
}
