const activeConnections = new Set<string>();

export async function handler(event: any): Promise<{ statusCode: number; body: string }> {
  const routeKey = event.requestContext?.routeKey || '$default';
  const connectionId = event.requestContext?.connectionId || `conn-${Date.now()}`;

  console.log(`[WEBSOCKET HANDLER] Route: ${routeKey}, Connection: ${connectionId}`);

  switch (routeKey) {
    case '$connect': {
      activeConnections.add(connectionId);
      return { statusCode: 200, body: 'Connected.' };
    }
    case '$disconnect': {
      activeConnections.delete(connectionId);
      return { statusCode: 200, body: 'Disconnected.' };
    }
    case '$default':
    default: {
      const body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {};
      if (body.action === 'ping') {
        return { statusCode: 200, body: JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }) };
      }
      return { statusCode: 200, body: 'Acknowledged.' };
    }
  }
}
