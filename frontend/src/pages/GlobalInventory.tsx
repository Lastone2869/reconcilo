import React, { useState } from 'react';
import { Card } from '../components/ui/Card.js';
import { SearchInput } from '../components/ui/SearchInput.js';
import { Button } from '../components/ui/Button.js';
import { Download, Plus } from 'lucide-react';

import { DataSyncService, GlobalInventoryItem } from '../services/data-sync.service.js';

export const GlobalInventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryItems, setInventoryItems] = useState<GlobalInventoryItem[]>(() =>
    DataSyncService.getGlobalInventory()
  );

  React.useEffect(() => {
    const sync = () => {
      setInventoryItems(DataSyncService.getGlobalInventory());
    };
    const unsub = DataSyncService.subscribe(sync);
    return () => unsub();
  }, []);

  const filtered = inventoryItems.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Global Enterprise Inventory
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Centralized SKU directory and cross-store stock balance monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
            Export Manifest
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
            Add New SKU
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <SearchInput
            placeholder="Filter by SKU code, product title, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-96"
          />
        </div>

        <div className="overflow-x-auto border border-outline-variant/40 dark:border-outline-variant-dark/40 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low dark:bg-surface-container-low-dark border-b border-outline-variant/60 dark:border-outline-variant-dark/60">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant dark:text-on-surface-variant-dark">SKU / Item</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant dark:text-on-surface-variant-dark">Category</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant dark:text-on-surface-variant-dark text-right">Downtown</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant dark:text-on-surface-variant-dark text-right">Uptown</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant dark:text-on-surface-variant-dark text-right">Seattle</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant dark:text-on-surface-variant-dark text-right">Austin</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant dark:text-on-surface-variant-dark text-right">Total Fleet</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant dark:text-on-surface-variant-dark text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 dark:divide-outline-variant-dark/30 bg-surface-container-lowest dark:bg-surface-container-dark">
              {filtered.map((item) => (
                <tr key={item.sku} className="hover:bg-surface-container-low/60 dark:hover:bg-surface-container-high-dark/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-on-surface dark:text-on-surface-dark">{item.name}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant dark:text-on-surface-variant-dark">{item.sku}</p>
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant dark:text-on-surface-variant-dark">{item.category}</td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium text-on-surface dark:text-on-surface-dark">{item.downtownStock}</td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium text-on-surface dark:text-on-surface-dark">{item.uptownStock}</td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium text-on-surface dark:text-on-surface-dark">{item.seattleStock}</td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium text-on-surface dark:text-on-surface-dark">{item.austinStock}</td>
                  <td className="py-3.5 px-4 text-right font-display font-bold tabular-nums text-primary dark:text-primary-dark text-sm">
                    {item.total}
                  </td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium text-on-surface dark:text-on-surface-dark">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
