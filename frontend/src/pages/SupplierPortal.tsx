import React, { useState } from 'react';
import { PackageCheck, Truck, Plus, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { StatusPill } from '../components/ui/StatusPill.js';

export const SupplierPortalPage: React.FC = () => {
  const [shipments, setShipments] = useState([
    {
      asn_id: 'ASN-20260908-01',
      destination: 'Downtown Flagship #001',
      items: 'Espresso Roast Beans (100kg), Oat Milk (200L)',
      carrier: 'FreightStar Express',
      tracking_num: 'FS-984210492-US',
      status: 'In Transit',
      eta: 'Tomorrow, 9:00 AM',
    },
    {
      asn_id: 'ASN-20260907-03',
      destination: 'Downtown Flagship #001',
      items: 'Compostable Cups 12oz (Pack 500)',
      carrier: 'EcoDelivery Local',
      tracking_num: 'ECO-10928-NY',
      status: 'Delivered',
      eta: 'Delivered Today',
    },
  ]);

  const [showNewASNModal, setShowNewASNModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('prod-001');
  const [quantity, setQuantity] = useState(50);
  const [successNotice, setSuccessNotice] = useState('');

  const handleCreateASN = (e: React.FormEvent) => {
    e.preventDefault();
    const newASN = {
      asn_id: `ASN-${Date.now().toString().slice(-6)}`,
      destination: 'Downtown Flagship #001',
      items: `Restock Order: ${quantity} units`,
      carrier: 'FastFreight Logistics',
      tracking_num: `FF-${Math.floor(Math.random() * 900000 + 100000)}`,
      status: 'In Transit',
      eta: 'In 2 Days',
    };

    setShipments([newASN, ...shipments]);
    setShowNewASNModal(false);
    setSuccessNotice(`Advanced Shipping Notice ${newASN.asn_id} created successfully.`);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Supplier Restock & ASN Dispatch Portal
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Partner fulfillment portal for Advanced Shipping Notices (ASN) and direct store replenishment
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowNewASNModal(true)}
        >
          Dispatch New Shipment (ASN)
        </Button>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successNotice}</span>
        </div>
      )}

      {showNewASNModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-surface-container-dark p-6 rounded-2xl max-w-md w-full border border-outline-variant dark:border-outline-variant-dark shadow-xl">
            <h2 className="text-lg font-bold font-display text-on-surface dark:text-on-surface-dark mb-1">
              Create Restock Shipment (ASN)
            </h2>
            <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mb-4">
              Direct inventory replenishment dispatch to store terminal
            </p>

            <form onSubmit={handleCreateASN} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-on-surface dark:text-on-surface-dark">Target Store</label>
                <input
                  type="text"
                  disabled
                  value="Downtown Flagship #001"
                  className="w-full p-2.5 bg-surface-container dark:bg-surface-container-dark rounded-lg border border-outline-variant dark:border-outline-variant-dark font-medium text-on-surface dark:text-on-surface-dark"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-on-surface dark:text-on-surface-dark">Select Catalog Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low dark:bg-surface-container-dark rounded-lg border border-outline-variant dark:border-outline-variant-dark font-medium text-on-surface dark:text-on-surface-dark"
                >
                  <option value="prod-001">Espresso Roast Beans 1kg (CF-ESP-1KG)</option>
                  <option value="prod-002">Single Origin Filter 250g (CF-FLT-250G)</option>
                  <option value="prod-003">Barista Oat Milk 1L (MLK-OAT-1L)</option>
                  <option value="prod-004">Organic Vanilla Syrup 750ml (SYR-VAN-750)</option>
                  <option value="prod-005">Compostable Cups 12oz Pack 50 (CUP-COM-12)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-on-surface dark:text-on-surface-dark">Restock Units Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 bg-surface-container-low dark:bg-surface-container-dark rounded-lg border border-outline-variant dark:border-outline-variant-dark font-medium tabular-nums text-on-surface dark:text-on-surface-dark"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowNewASNModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Confirm Dispatch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Card headerWash title="Active Restock Shipments">
        <div className="divide-y divide-outline-variant/30">
          {shipments.map((ship) => (
            <div key={ship.asn_id} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-primary-on-container flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-on-surface dark:text-on-surface-dark">
                    {ship.asn_id} &bull; {ship.destination}
                  </h3>
                  <p className="text-xs text-on-surface dark:text-on-surface-dark mt-0.5">{ship.items}</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono mt-0.5">
                    Carrier: {ship.carrier} &bull; Tracking: {ship.tracking_num}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <StatusPill
                  status={ship.status === 'Delivered' ? 'synced' : 'pending'}
                  label={ship.status}
                />
                <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark mt-1 font-medium">{ship.eta}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
