import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  Wifi,
  WifiOff,
  Package,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { IndexedDBService, LocalProduct, LocalTransaction } from '../services/indexeddb.service.js';
import { useConnectivity } from '../hooks/useConnectivity.js';
import { useAuthStore } from '../stores/auth.store.js';

interface CartItem {
  product: LocalProduct;
  quantity: number;
}

export const POSPage: React.FC = () => {
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentSale, setRecentSale] = useState<LocalTransaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { isOnline, connectivityState, pendingCount, manualOffline, toggleOfflineSimulation, triggerSync } =
    useConnectivity();
  const { user } = useAuthStore();

  const loadCatalog = async () => {
    const list = await IndexedDBService.getLocalInventory();
    setProducts(list);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: LocalProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.product_id === product.product_id);
      if (existing) {
        return prev.map((item) =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.product_id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.product_id !== productId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + item.product.unit_price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      let lastTx: LocalTransaction | null = null;
      for (const item of cart) {
        lastTx = await IndexedDBService.recordSale({
          store_id: user?.store_id || 'store-001',
          user_id: user?.user_id || 'staff-01',
          product_id: item.product.product_id,
          quantity: item.quantity,
          unit_price: item.product.unit_price,
        });
      }

      setRecentSale(lastTx);
      clearCart();
      await loadCatalog(); // Refresh remaining stock

      // If currently online, trigger sync
      if (isOnline) {
        triggerSync();
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar with Offline simulation controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest dark:bg-surface-container-dark p-4 rounded-xl border border-outline-variant/60 dark:border-outline-variant-dark/60 shadow-soft">
        <div>
          <h1 className="text-xl font-bold font-display text-on-surface dark:text-on-surface-dark flex items-center gap-2">
            POS Register #01
            <StatusPill
              status={isOnline ? 'synced' : 'pending'}
              label={isOnline ? 'Connected' : 'Offline Mode'}
            />
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Store: Downtown Flagship #001 &bull; Cashier: {user?.name || 'Staff User'}
          </p>
        </div>

        {/* Offline simulator toggle button for live testing */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleOfflineSimulation}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              manualOffline
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-surface-container text-on-surface border-outline-variant/60 hover:bg-surface-container-high'
            }`}
          >
            {manualOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{manualOffline ? 'Simulating Offline' : 'Simulate Network Drop'}</span>
          </button>

          {pendingCount > 0 && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-300/40">
              {pendingCount} unsynced
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Catalog (left) & Cart (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Selection Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-outline" />
            <input
              type="text"
              placeholder="Scan barcode, search product name, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest dark:bg-surface-container-dark border border-outline-variant/60 dark:border-outline-variant-dark rounded-xl text-sm text-on-surface dark:text-on-surface-dark placeholder:text-outline focus:ring-2 focus:ring-primary/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.product_id}
                onClick={() => addToCart(prod)}
                className="bg-surface-container-lowest dark:bg-surface-container-dark border border-outline-variant/60 dark:border-outline-variant-dark/60 rounded-xl p-4 hover:border-primary/60 hover:shadow-soft transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono font-medium text-on-surface-variant dark:text-on-surface-variant-dark">
                      {prod.sku}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        prod.local_quantity <= 10
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-primary-container text-primary-on-container'
                      }`}
                    >
                      {prod.local_quantity} in stock
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold font-display text-on-surface dark:text-on-surface-dark mt-2 group-hover:text-primary transition-colors">
                    {prod.name}
                  </h3>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-outline-variant/20">
                  <span className="text-base font-bold font-display text-on-surface dark:text-on-surface-dark tabular-nums">
                    ${prod.unit_price.toFixed(2)}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-surface-container group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Checkout Cart */}
        <div className="lg:col-span-5">
          <Card
            headerWash
            title="Current Sale"
            subtitle={`${cart.length} distinct item(s)`}
            action={
              cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-error hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )
            }
          >
            {cart.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant dark:text-on-surface-variant-dark">
                <ShoppingCart className="w-12 h-12 mx-auto stroke-[1.2] text-outline/50 mb-3" />
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs text-outline mt-1">
                  Select items from the catalog or scan barcode to add
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart item list */}
                <div className="divide-y divide-outline-variant/30 dark:divide-outline-variant-dark/30 max-h-64 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.product_id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-on-surface dark:text-on-surface-dark truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] text-on-surface-variant font-mono">
                          ${item.product.unit_price.toFixed(2)} each
                        </p>
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.product_id, -1)}
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center hover:bg-surface-container-high text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-display tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.product_id, 1)}
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center hover:bg-surface-container-high text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold font-display tabular-nums text-right min-w-[50px]">
                        ${(item.product.unit_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Total */}
                <div className="pt-4 border-t border-outline-variant/40 space-y-1.5 text-xs text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales Tax (8%)</span>
                    <span className="tabular-nums font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-on-surface dark:text-on-surface-dark pt-2 border-t border-outline-variant/30">
                    <span>Total Due</span>
                    <span className="tabular-nums">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Complete Sale Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  loading={isProcessing}
                  onClick={handleCheckout}
                >
                  <span>Complete Sale (${total.toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <p className="text-[11px] text-center text-on-surface-variant">
                  {isOnline
                    ? '✓ Will sync immediately with cloud inventory'
                    : '⚡ Will save to IndexedDB & sync when reconnected'}
                </p>
              </div>
            )}
          </Card>

          {/* Recent Sale Confirmation banner */}
          {recentSale && (
            <div className="mt-4 p-4 rounded-xl bg-primary-fixed/20 border border-primary/30 flex items-start gap-3 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-primary dark:text-primary-dark">
                  Sale Recorded Successfully
                </p>
                <p className="text-on-surface-variant font-mono mt-0.5">
                  ID: {recentSale.transaction_id.substring(0, 18)}... (Seq: {recentSale.device_sequence})
                </p>
                <div className="mt-1">
                  <StatusPill
                    status={recentSale.local_sync_status}
                    label={recentSale.local_sync_status === 'SYNCED' ? 'Cloud Reconciled' : 'Stored in IndexedDB'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
