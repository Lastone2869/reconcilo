import {
  ApiResponse,
  GetInventoryResponse,
  Inventory,
  Product,
  UserRole,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
import { authorizeRequest } from '../utils/auth.util.js';

export async function handler(event: any): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // RBAC check: Staff, Manager, Admin allowed per RULE-048, 049, 050
  const auth = await authorizeRequest(event, [
    UserRole.STORE_STAFF,
    UserRole.STORE_MANAGER,
    UserRole.ADMIN,
  ]);
  if (!auth.authorized) {
    return auth.errorResponse;
  }

  const storeId = event.pathParameters?.storeId || 'store-001';

  try {
    const allInventory = await DynamoDBAdapter.queryByAttribute<Inventory>(
      'Inventory',
      'store_id',
      storeId
    );
    const allProducts = await DynamoDBAdapter.scanAll<Product>('Products');
    const productMap = new Map<string, Product>();
    allProducts.forEach((p) => productMap.set(p.product_id, p));

    const items = allInventory.map((inv) => {
      const prod = productMap.get(inv.product_id);
      return {
        ...inv,
        product_name: prod?.name || inv.product_id,
        sku: prod?.sku || 'SKU-UNKNOWN',
        unit_price: prod?.unit_price || 0,
      };
    });

    const response: ApiResponse<GetInventoryResponse> = {
      success: true,
      data: {
        store_id: storeId,
        items,
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
