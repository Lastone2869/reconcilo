import { LoginRequest, ApiResponse, LoginResponse } from '@reconcilo/shared';
import { CognitoAdapter } from '../adapters/cognito.adapter.js';

export async function handler(event: any): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body: LoginRequest = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    if (!body || !body.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Email is required' },
        } as ApiResponse<null>),
      };
    }

    const session = await CognitoAdapter.authenticateUser(body.email, body.password);

    if (!session) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: { code: 'AUTH_FAILED', message: 'Invalid email or password' },
        } as ApiResponse<null>),
      };
    }

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        token: session.token,
        user: {
          user_id: session.sub,
          email: session.email,
          name: session.name,
          role: session.role,
          store_id: session.store_id,
        },
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message },
      } as ApiResponse<null>),
    };
  }
}
