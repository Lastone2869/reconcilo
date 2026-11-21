import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { DataSyncService } from '../services/data-sync.service.js';
import { SuspiciousRuleType, SuspiciousActivityStatus } from '@reconcilo/shared';

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
  const [cartPulse, setCartPulse] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const addToCart = useCallback((product: LocalProduct) => {
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
    // Trigger cart badge pulse animation
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 400);
  }, []);

  // Barcode scanner: auto-add on Enter when exact SKU match
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && searchQuery.trim()) {
        const exactMatch = products.find(
          (p) =>
            p.sku.toLowerCase() === searchQuery.trim().toLowerCase() ||
            p.name.toLowerCase() === searchQuery.trim().toLowerCase()
        );
        if (exactMatch) {
          addToCart(exactMatch);
          setSearchQuery('');
          e.preventDefault();
        }
      }
    },
    [searchQuery, products, addToCart]
  );

  // Global keyboard shortcuts for POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 → focus search/barcode input
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape → clear cart
      if (e.key === 'Escape' && cart.length > 0 && !isProcessing) {
        clearCart();
      }
      // Space → complete sale (only when not in an input)
      if (
        e.key === ' ' &&
        cart.length > 0 &&
        !isProcessing &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isProcessing]);

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
      const sysConfig = DataSyncService.getSystemConfig();

      for (const item of cart) {
        lastTx = await IndexedDBService.recordSale({
          store_id: user?.store_id || 'store-001',
          user_id: user?.user_id || 'staff-01',
          product_id: item.product.product_id,
          quantity: item.quantity,
          unit_price: item.product.unit_price,
        });

        // Decrement global stock in sync service
        DataSyncService.decrementDowntownStock(item.product.product_id, item.quantity);

        // Check if single sale quantity triggers suspicious activity
        if (item.quantity >= sysConfig.suspicious_quantity_threshold) {
          const alertId = `alert-qty-${Date.now().toString().slice(-4)}`;
          const alerts = DataSyncService.getSuspiciousAlerts();
          DataSyncService.saveSuspiciousAlerts([
            {
              alert_id: alertId,
              store_id: user?.store_id || 'store-001',
              user_id: user?.user_id || 'staff-01',
              transaction_ids: [lastTx.transaction_id],
              triggered_rule: SuspiciousRuleType.EXCESSIVE_QUANTITY,
              rule_description: `Single transaction quantity (${item.quantity}) exceeds configurable threshold of ${sysConfig.suspicious_quantity_threshold}`,
              threshold_value: sysConfig.suspicious_quantity_threshold,
              actual_value: item.quantity,
              status: SuspiciousActivityStatus.FLAGGED,
              detected_at: new Date().toISOString(),
            },
            ...alerts,
          ]);

          DataSyncService.addNotification({
            type: 'SUSPICIOUS',
            severity: 'HIGH',
            title: 'Suspicious Activity Flagged',
            message: `POS Terminal recorded single sale of ${item.quantity} units (${item.product.name}) exceeding threshold of ${sysConfig.suspicious_quantity_threshold}.`,
            time: 'Just now',
            read: false,
            link: '/suspicious-activity',
          });
        }

        // Check low stock threshold
        const remainingStock = Math.max(0, item.product.local_quantity - item.quantity);
        if (remainingStock <= sysConfig.low_stock_default_threshold) {
          DataSyncService.addNotification({
            type: 'LOW_STOCK',
            severity: 'MEDIUM',
            title: 'Low Stock Warning',
            message: `${item.product.name} dropped to ${remainingStock} units (threshold: ${sysConfig.low_stock_default_threshold}).`,
            time: 'Just now',
            read: false,
            link: '/global-inventory',
          });
        }
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
                : 'bg-surface-container dark:bg-surface-container-dark text-on-surface dark:text-on-surface-dark border-outline-variant/60 dark:border-outline-variant-dark/60 hover:bg-surface-container-high dark:hover:bg-surface-container-high-dark'
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
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-outline" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode, search product name, or SKU… [F2]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest dark:bg-surface-container-dark border border-outline-variant/60 dark:border-outline-variant-dark rounded-xl text-sm text-on-surface dark:text-on-surface-dark placeholder:text-outline focus:ring-2 focus:ring-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Search or scan barcode"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.product_id}
                role="button"
                tabIndex={0}
                aria-label={`Add ${prod.name} to sale cart`}
                onClick={() => addToCart(prod)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addToCart(prod);
                  }
                }}
                className="bg-surface-container-lowest dark:bg-surface-container-dark border border-outline-variant/60 dark:border-outline-variant-dark/60 rounded-xl p-4 hover:border-primary/60 hover:shadow-soft active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-outline-variant/20 dark:border-outline-variant-dark/20">
                  <span className="text-base font-bold font-display text-on-surface dark:text-on-surface-dark tabular-nums">
                    ${prod.unit_price.toFixed(2)}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container dark:bg-surface-container-high-dark text-on-surface dark:text-on-surface-dark group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all" aria-hidden="true">
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
            title={<span className={cartPulse ? 'animate-pulse' : ''}>Current Sale</span>}
            subtitle={`${cart.length} distinct item(s)`}
            action={
              cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-error dark:text-error-dark hover:underline flex items-center gap-1"
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
                        <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono">
                          ${item.product.unit_price.toFixed(2)} each
                        </p>
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.product_id, -1)}
                          aria-label={`Decrease quantity of ${item.product.name}`}
                          className="w-9 h-9 rounded-lg bg-surface-container dark:bg-surface-container-high-dark text-on-surface dark:text-on-surface-dark flex items-center justify-center hover:bg-surface-container-high dark:hover:bg-surface-container-highest-dark active:scale-95 transition-all text-sm font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold font-display tabular-nums text-on-surface dark:text-on-surface-dark">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.product_id, 1)}
                          aria-label={`Increase quantity of ${item.product.name}`}
                          className="w-9 h-9 rounded-lg bg-surface-container dark:bg-surface-container-high-dark text-on-surface dark:text-on-surface-dark flex items-center justify-center hover:bg-surface-container-high dark:hover:bg-surface-container-highest-dark active:scale-95 transition-all text-sm font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <span className="text-xs font-bold font-display tabular-nums text-right min-w-[50px] text-on-surface dark:text-on-surface-dark">
                        ${(item.product.unit_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Total */}
                <div className="pt-4 border-t border-outline-variant/40 dark:border-outline-variant-dark/40 space-y-1.5 text-xs text-on-surface-variant dark:text-on-surface-variant-dark">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales Tax (8%)</span>
                    <span className="tabular-nums font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-on-surface dark:text-on-surface-dark pt-2 border-t border-outline-variant/30 dark:border-outline-variant-dark/30">
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

                <p className="text-[11px] text-center text-on-surface-variant dark:text-on-surface-variant-dark">
                  {isOnline
                    ? '✓ Will sync immediately with cloud inventory'
                    : '⚡ Will save to IndexedDB & sync when reconnected'}
                </p>

                {/* Keyboard shortcut hints */}
                <div className="mt-3 pt-3 border-t border-outline-variant/20 dark:border-outline-variant-dark/20 flex items-center justify-center gap-4 text-[10px] text-on-surface-variant/70 dark:text-on-surface-variant-dark/60">
                  <span><kbd className="px-1.5 py-0.5 bg-surface-container dark:bg-surface-container-high-dark rounded text-[10px] font-mono font-semibold text-on-surface dark:text-on-surface-dark">F2</kbd> Search</span>
                  <span><kbd className="px-1.5 py-0.5 bg-surface-container dark:bg-surface-container-high-dark rounded text-[10px] font-mono font-semibold text-on-surface dark:text-on-surface-dark">Space</kbd> Pay</span>
                  <span><kbd className="px-1.5 py-0.5 bg-surface-container dark:bg-surface-container-high-dark rounded text-[10px] font-mono font-semibold text-on-surface dark:text-on-surface-dark">Esc</kbd> Clear</span>
                </div>
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
