'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthProvider'; // Auth context'in yolu
import {
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiTag,
} from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import {
  getAssetsAction,
  updateAssetCategoryAction,
} from '@/actions/positions';
import { Asset } from '@/types/positions';
import { Category } from '@/types/settings';
import { getCategoriesAction } from '@/actions/categories';

export default function PositionsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null); // Hangi hisseyi düzenliyoruz?
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // Hangi kategoriyi seçtik?
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [assetsData, categoriesData] = await Promise.all([
      getAssetsAction(user.uid),
      getCategoriesAction(user.uid),
    ]);
    setAssets(assetsData);
    setCategories(categoriesData);
  };

  const openCategorizeModal = (asset: any) => {
    setSelectedAsset(asset);
    setSelectedCategoryId(''); // Sıfırla
    modalRef.current?.showModal();
  };

  const handleSaveCategory = async () => {
    if (!user || !selectedAsset || !selectedCategoryId) return;

    const res = await updateAssetCategoryAction(
      user.uid,
      selectedAsset.id,
      selectedCategoryId,
    );

    if (res.success) {
      // Modalı kapat
      modalRef.current?.close();
      // Listeyi tazele (Böylece hisse Inbox'tan düşüp aşağıya inecek)
      await loadData();
    } else {
      alert('Hata: ' + res.message);
    }
  };

  const formatMoney = (val: string, currency: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Backend'i Tetikleyen Fonksiyon (Sync All)
  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const token = await user.getIdToken();
      // Rust Backend URL
      const res = await fetch('http://localhost:8080/api/v1/sync/all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await loadData();
      } else {
        const err = await res.text();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const inboxAssets = assets.filter((a) => a.category_id === 'uncategorized');
  const portfolioAssets = assets.filter(
    (a) => a.category_id !== 'uncategorized',
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <FiTag /> Categorize Asset
          </h3>

          {selectedAsset && (
            <div className="space-y-4 py-4">
              <div className="alert alert-info py-2 text-sm shadow-sm">
                <span>
                  Assigning category for <strong>{selectedAsset.symbol}</strong>{' '}
                  ({selectedAsset.name})
                </span>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Select Category</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a category...
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.target_percentage}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="modal-action">
            <form method="dialog">
              {/* Kapat Butonu */}
              <button className="btn btn-ghost">Cancel</button>
            </form>
            {/* Kaydet Butonu */}
            <button
              className="btn btn-primary"
              onClick={handleSaveCategory}
              disabled={!selectedCategoryId}
            >
              Save
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* HEADER */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h1 className="text-3xl font-bold">Positions</h1>
          <p className="text-base-content/70">
            Manage your assets and categories
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncing}
        >
          <FiRefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync with Brokers'}
        </button>
      </div>

      {/* INBOX SECTION (Uncategorized) */}
      {inboxAssets.length > 0 && (
        <div className="card bg-warning/10 border-warning/20 border shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-warning flex items-center gap-2">
              <FiAlertCircle /> Uncategorized Assets ({inboxAssets.length})
            </h2>
            <p className="mb-4 text-sm opacity-80">
              These assets are new. Assign them to a category to include them in
              your strategy.
            </p>

            <div className="bg-base-100 overflow-x-auto rounded-lg">
              <table className="table-zebra table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Asset</th>
                    <th>Qty</th>
                    <th>Value (Est.)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inboxAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td>
                        <div className="badge badge-ghost text-xs font-bold">
                          {asset.source}
                        </div>
                      </td>
                      <td>
                        <div className="font-bold">{asset.symbol}</div>
                        <div className="text-xs opacity-50">{asset.name}</div>
                      </td>
                      <td>{asset.amount}</td>
                      <td>
                        {formatMoney(
                          asset.current_price.toString(),
                          asset.currency,
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-outline btn-warning gap-1"
                          onClick={() => openCategorizeModal(asset)}
                        >
                          <FiTag /> Categorize
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PORTFOLIO SECTION */}
      <div className="card bg-base-100 border-base-300 border shadow-xl">
        <div className="card-body p-0">
          <div className="border-base-200 border-b p-6">
            <h2 className="card-title flex items-center gap-2">
              <FiCheckCircle className="text-success" /> Your Portfolio
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="bg-base-200/50">
                  <th>Source</th>
                  <th>Symbol</th>
                  <th>Category</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Avg Cost</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                {portfolioAssets.map((asset) => (
                  <tr key={asset.id} className="hover">
                    <td>
                      <span
                        className={`badge text-xs font-bold ${asset.source === 'IBKR' ? 'badge-error text-white' : 'badge-info text-white'}`}
                      >
                        {asset.source}
                      </span>
                    </td>
                    <td>
                      <div className="font-bold">{asset.symbol}</div>
                      <div className="text-xs opacity-50">{asset.name}</div>
                    </td>
                    <td>
                      <div className="badge badge-outline">
                        {asset.category_id}
                      </div>
                    </td>
                    <td className="text-right font-mono">{asset.amount}</td>
                    <td className="text-right font-mono">
                      {formatMoney(asset.avg_cost.toString(), asset.currency)}
                    </td>
                    <td className="text-right font-mono">
                      {formatMoney(
                        asset.current_price.toString(),
                        asset.currency,
                      )}
                    </td>
                    <td
                      className={`text-right font-mono font-bold ${parseFloat(asset.unrealized_pnl.toString()) >= 0 ? 'text-success' : 'text-error'}`}
                    >
                      {parseFloat(asset.unrealized_pnl.toString()) > 0
                        ? '+'
                        : ''}
                      {formatMoney(
                        asset.unrealized_pnl.toString(),
                        asset.currency,
                      )}
                    </td>
                  </tr>
                ))}
                {portfolioAssets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center opacity-50">
                      No categorized assets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
