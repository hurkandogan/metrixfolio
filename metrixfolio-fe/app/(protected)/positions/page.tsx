'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthProvider'; // Auth context'in yolu
import {
  FiAlertCircle,
  FiCheckCircle,
  FiTag,
  FiEdit2,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiSearch,
} from 'react-icons/fi';
import {
  getAssetsAction,
  updateAssetAction,
  deleteAssetAction,
} from '@/actions/positions';
import { Asset } from '@/types/positions';
import { Category } from '@/types/settings';
import { getCategoriesAction } from '@/actions/categories';
import AddManualAssetModal from './components/AddManualAssetsModal';

type SortKey = 'source' | 'symbol' | 'category_id' | 'amount' | 'avg_cost' | 'current_price' | 'market_value' | 'unrealized_pnl';

export default function PositionsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    symbol: '',
    name: '',
    amount: '',
    avg_cost: '',
    currency: 'USD',
    category_id: '',
  });
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    let [assetsData, categoriesData] = await Promise.all([
      getAssetsAction(user.uid),
      getCategoriesAction(user.uid),
    ]);

    // Recalculate PnL on the frontend to ensure accuracy and prevent totals from breaking due to NaN
    assetsData = assetsData.map((asset) => {
      const amount = parseFloat(asset.amount?.toString()) || 0;
      const currentPrice = parseFloat(asset.current_price?.toString()) || 0;
      const avgCost = parseFloat(asset.avg_cost?.toString()) || 0;
      const multiplier = parseFloat(asset.multiplier?.toString()) || 1;

      const marketValue = amount * currentPrice * multiplier;
      const unrealizedPnl = (currentPrice - avgCost) * amount * multiplier;

      return {
        ...asset,
        amount,
        current_price: currentPrice,
        avg_cost: avgCost,
        market_value: marketValue,
        unrealized_pnl: unrealizedPnl,
      };
    });

    setAssets(assetsData);
    setCategories(categoriesData);
  };

  const openEditModal = (asset: any) => {
    setSelectedAsset(asset);
    setEditForm({
      symbol: asset.symbol || '',
      name: asset.name || '',
      amount: asset.amount?.toString() || '',
      avg_cost: asset.original_avg_cost?.toString() || asset.avg_cost?.toString() || '',
      currency: asset.original_currency || asset.currency || 'USD',
      category_id: asset.category_id !== 'uncategorized' ? asset.category_id : '',
    });
    modalRef.current?.showModal();
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !selectedAsset) return;

    const res = await updateAssetAction(
      user.uid,
      selectedAsset.id,
      {
        symbol: editForm.symbol,
        name: editForm.name,
        amount: parseFloat(editForm.amount),
        avg_cost: parseFloat(editForm.avg_cost),
        currency: editForm.currency,
        category_id: editForm.category_id || 'uncategorized',
      }
    );

    if (res.success) {
      modalRef.current?.close();
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

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedAssets = portfolioAssets
    .filter((asset) => {
      const q = searchQuery.toLowerCase();
      return (
        asset.symbol.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        getCategoryName(asset.category_id).toLowerCase().includes(q) ||
        asset.source.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;

      let valA: any = a[key as keyof Asset];
      let valB: any = b[key as keyof Asset];

      if (key === 'category_id') {
        valA = getCategoryName(a.category_id);
        valB = getCategoryName(b.category_id);
      } else if (key === 'unrealized_pnl') {
        valA = parseFloat(a.unrealized_pnl as any) || 0;
        valB = parseFloat(b.unrealized_pnl as any) || 0;
      }

      if (valA < valB) {
        return direction === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />;
  };

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
            <FiEdit2 /> Edit Asset
          </h3>

          {selectedAsset && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-4">
              <div className="alert alert-info py-2 text-sm shadow-sm">
                <span>
                  Editing <strong>{selectedAsset.symbol}</strong> ({selectedAsset.name})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Symbol</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input input-bordered uppercase"
                    value={editForm.symbol}
                    onChange={(e) =>
                      setEditForm({ ...editForm, symbol: e.target.value.toLocaleUpperCase() })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Name</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input input-bordered"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Quantity</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    className="input input-bordered"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Avg Cost (Unit)</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    className="input input-bordered"
                    value={editForm.avg_cost}
                    onChange={(e) => setEditForm({ ...editForm, avg_cost: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Currency</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={editForm.currency}
                    onChange={(e) =>
                      setEditForm({ ...editForm, currency: e.target.value })
                    }
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Category</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
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

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => modalRef.current?.close()}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          )}
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
        <div className="flex items-center gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
            <input
              type="text"
              placeholder="Search assets..."
              className="input input-bordered w-full max-w-xs pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
                          onClick={() => openEditModal(asset)}
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
                  <th className="cursor-pointer hover:bg-base-200" onClick={() => handleSort('source')}>Source {renderSortIcon('source')}</th>
                  <th className="cursor-pointer hover:bg-base-200" onClick={() => handleSort('symbol')}>Symbol {renderSortIcon('symbol')}</th>
                  <th className="cursor-pointer hover:bg-base-200" onClick={() => handleSort('category_id')}>Category {renderSortIcon('category_id')}</th>
                  <th className="cursor-pointer hover:bg-base-200 text-right" onClick={() => handleSort('amount')}>Qty {renderSortIcon('amount')}</th>
                  <th className="cursor-pointer hover:bg-base-200 text-right" onClick={() => handleSort('avg_cost')}>Avg Cost {renderSortIcon('avg_cost')}</th>
                  <th className="cursor-pointer hover:bg-base-200 text-right" onClick={() => handleSort('current_price')}>Price {renderSortIcon('current_price')}</th>
                  <th className="cursor-pointer hover:bg-base-200 text-right" onClick={() => handleSort('market_value')}>Value (Est.) {renderSortIcon('market_value')}</th>
                  <th className="cursor-pointer hover:bg-base-200 text-right" onClick={() => handleSort('unrealized_pnl')}>P/L {renderSortIcon('unrealized_pnl')}</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedAssets.map((asset) => (
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
                          onClick={() => openEditModal(asset)}
                          title="Edit Position"
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
                {filteredAndSortedAssets.length === 0 && (
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
