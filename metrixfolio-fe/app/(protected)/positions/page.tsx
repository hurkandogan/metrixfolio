'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthProvider'; // Auth context'in yolu
import {
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiTag,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import {
  getAssetsAction,
  updateAssetCategoryAction,
  deleteAssetAction,
} from '@/actions/positions';
import { Asset } from '@/types/positions';
import { Category } from '@/types/settings';
import { getCategoriesAction } from '@/actions/categories';
import AddManualAssetModal from './components/AddManualAssetsModal';

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

  const handleDeleteAsset = async (assetId: string) => {
    if (!user || !confirm('Are you sure you want to delete this asset?')) return;

    const res = await deleteAssetAction(user.uid, assetId);
    if (res.success) {
      await loadData();
    } else {
      alert('Error: ' + res.message);
    }
  };

  const calculateMarketValue = (asset: Asset) => {
    // Backend zaten market_value hesaplayıp gönderiyor ama
    // anlık hesaplama gerekirse diye burada da tutabiliriz.
    // Ancak backend verisi (USD normalize edilmiş) daha güvenilir.
    return asset.market_value || 0;
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : catId;
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

  const inboxAssets = assets.filter((a) => a.category_id === 'uncategorized');
  const portfolioAssets = assets.filter(
    (a) => a.category_id !== 'uncategorized',
  );

  // --- TOPLAMLAR ---
  const totalMarketValue = portfolioAssets.reduce(
    (sum, asset) => sum + (asset.market_value || 0),
    0,
  );
  const totalUnrealizedPnl = portfolioAssets.reduce(
    (sum, asset) => sum + (asset.unrealized_pnl || 0),
    0,
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
              <button className="btn btn-ghost">Cancel</button>
            </form>
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

      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h1 className="text-3xl font-bold">Positions</h1>
          <p className="text-base-content/70">
            Manage your assets and categories
          </p>
        </div>
        <div className="flex gap-2">
          <AddManualAssetModal categories={categories} onSuccess={loadData} />
        </div>
      </div>

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
                    <th>Price</th>
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
                        {formatMoney(
                          calculateMarketValue(asset).toString(),
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
                  <th className="text-right">Value (Est.)</th>
                  <th className="text-right">P/L</th>
                  <th className="text-right">Actions</th>
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
                        {getCategoryName(asset.category_id)}
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
                    <td className="text-right font-mono">
                      {formatMoney(
                        (asset.market_value || 0).toString(),
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
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-square btn-ghost btn-xs"
                          onClick={() => openCategorizeModal(asset)}
                          title="Edit Category"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="btn btn-square btn-ghost btn-xs text-error"
                          onClick={() => handleDeleteAsset(asset.id)}
                          title="Delete Asset"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {portfolioAssets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center opacity-50">
                      No categorized assets found.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* --- FOOTER (TOPLAMLAR) --- */}
              {portfolioAssets.length > 0 && (
                <tfoot>
                  <tr className="bg-base-200/50 font-bold text-base-content">
                    <td colSpan={6} className="text-right">
                      TOTALS:
                    </td>
                    <td className="text-right font-mono text-lg">
                      {formatMoney(totalMarketValue.toString(), 'USD')}
                    </td>
                    <td className={`text-right font-mono text-lg ${totalUnrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatMoney(totalUnrealizedPnl.toString(), 'USD')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
