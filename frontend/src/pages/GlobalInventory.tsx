import React, { useState } from 'react';
import { Card } from '../components/ui/Card.js';
import { SearchInput } from '../components/ui/SearchInput.js';
import { Button } from '../components/ui/Button.js';
import { Download, Plus } from 'lucide-react';

export const GlobalInventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const inventoryItems = [
    {
      sku: 'CF-ESP-1KG',
      name: 'Espresso Roast Beans 1kg',
      category: 'Coffee',
      downtownStock: 45,
      uptownStock: 60,
      seattleStock: 25,
      austinStock: 40,
      total: 170,
      unitPrice: 24.5,
    },
    {
      sku: 'CF-FLT-250G',
      name: 'Single Origin Filter 250g',
      category: 'Coffee',
      downtownStock: 30,
      uptownStock: 45,
      seattleStock: 20,
      austinStock: 35,
      total: 130,
      unitPrice: 14.0,
    },
    {
      sku: 'MLK-OAT-1L',
      name: 'Barista Oat Milk 1L',
      category: 'Dairy & Plant Milk',
      downtownStock: 80,
      uptownStock: 120,
      seattleStock: 45,
      austinStock: 90,
      total: 335,
      unitPrice: 4.25,
    },
    {
      sku: 'SYR-VAN-750',
      name: 'Organic Vanilla Syrup 750ml',
      category: 'Syrups',
      downtownStock: 15,
      uptownStock: 18,
      seattleStock: 6,
      austinStock: 14,
      total: 53,
      unitPrice: 11.5,
    },
    {
      sku: 'CUP-COM-12',
      name: 'Compostable Cups 12oz (Pack 50)',
      category: 'Packaging',
      downtownStock: 8,
      uptownStock: 40,
      seattleStock: 12,
      austinStock: 25,
      total: 85,
      unitPrice: 18.0,
    },
  ];

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
            <thead className="bg-surface-container-low dark:bg-surface-container-low-dark border-b border-outline-variant/60">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant">SKU / Item</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant">Category</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Downtown</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Uptown</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Seattle</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Austin</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Total Fleet</th>
                <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 bg-surface-container-lowest dark:bg-surface-container-dark">
              {filtered.map((item) => (
                <tr key={item.sku} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-on-surface dark:text-on-surface-dark">{item.name}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant">{item.sku}</p>
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant">{item.category}</td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium">{item.downtownStock}</td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium">{item.uptownStock}</td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium">{item.seattleStock}</td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium">{item.austinStock}</td>
                  <td className="py-3.5 px-4 text-right font-display font-bold tabular-nums text-primary text-sm">
                    {item.total}
                  </td>
                  <td className="py-3.5 px-4 text-right font-display tabular-nums font-medium">
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
