'use client';

import React, {
  useState,
  useTransition,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useAuth } from '@/context/AuthProvider';
import {
  addCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  addAssetAction,
  deleteAssetAction,
} from './actions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import {
  FiLoader,
  FiEdit2,
  FiSave,
  FiXCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiInfo,
} from 'react-icons/fi';
import {
  UserSettings,
  Category,
  ManualAsset,
  StockInfo,
} from '@/types/settings';

export default function SettingsPage() {
  const { user } = useAuth();

  const [settings, setSettings] = useState<UserSettings>({
    categories: [],
    manual_assets: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, startTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryTarget, setNewCategoryTarget] = useState<number>(0);
  const [itemToDelete, setItemToDelete] = useState<
    Category | ManualAsset | null
  >(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryTarget, setEditCategoryTarget] = useState<number | string>(
    '',
  );
  const totalTargetPercentage = useMemo(() => {
    return settings.categories.reduce((sum, cat) => {
      return sum + (cat.target_percentage || 0);
    }, 0);
  }, [settings.categories]);

  const [allStockInfo, setAllStockInfo] = useState<StockInfo[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  const modalRef = useRef<HTMLDialogElement>(null);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    isError: false,
  });

  const [newAssetTicker, setNewAssetTicker] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState<number>(0);
  const [newAssetCategory, setNewAssetCategory] = useState<string>('');

  const showModal = (
    title: string,
    message: string,
    isError: boolean = false,
  ) => {
    setModalContent({ title, message, isError });
    modalRef.current?.showModal();
  };

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (settings.categories.length > 0) {
      setNewAssetCategory(settings.categories[0].id);
    }
  }, [settings.categories]);

  const fetchInitialData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      const settingsSnap = await getDoc(settingsRef);

      const stockListUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/public/stock-list`;
      const stockListRes = await fetch(stockListUrl);

      const [settingsResult, stockListResult] = await Promise.all([
        settingsSnap,
        stockListRes,
      ]);

      if (settingsResult.exists()) {
        const data = settingsResult.data() as UserSettings;
        setSettings({
          categories: data.categories || [],
          manual_assets: data.manual_assets || [],
        });
      } else {
        console.log('No settings document found for user, using defaults.');
        setSettings({ categories: [], manual_assets: [] });
      }

      if (stockListResult.ok) {
        const stocks: StockInfo[] = await stockListResult.json();
        setAllStockInfo(stocks);
      } else {
        console.log(
          'Failed to fetch stock list, status:',
          stockListResult.status,
        );
        setAllStockInfo([]);
      }
    } catch (err: any) {
      showModal('Error Loading Settings', err.message, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!user) return showModal('Error', 'User not authenticated.', true);
    if (!newCategoryName.trim()) return;

    const targetAsNumber = parseFloat(String(newCategoryTarget)); // String'i sayıya çevir

    if (
      !newCategoryName.trim() ||
      (targetAsNumber <= 0 && targetAsNumber >= 100)
    ) {
      return showModal(
        'Input Error',
        'Category name and a target % (greater than 0 and less than 100) are required.',
        true,
      );
    }

    startTransition(async () => {
      const result = await addCategoryAction(
        user.uid,
        newCategoryName,
        targetAsNumber,
      );

      if (result.success && result.data) {
        setSettings((prevSettings) => ({
          ...prevSettings,
          categories: [...prevSettings.categories, result.data as Category],
        }));
        setNewCategoryName('');
        setNewCategoryTarget(0);
        showModal('Success', result.message, false);
      } else {
        showModal('Error', result.message, true);
      }
    });
  };

  const handleDeleteItem = (item: Category | ManualAsset) => {
    if (!user) return showModal('Error', 'User not authenticated.', true);

    const itemName = (item as Category).name || (item as ManualAsset).ticker;
    setItemToDelete(item);

    showModal(
      'Confirm Deletion',
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      true,
    );
  };

  const handleConfirmDelete = async () => {
    if (!user || !itemToDelete) return;

    startTransition(async () => {
      let result;
      if ('ticker' in itemToDelete) {
        result = await deleteAssetAction(user.uid, itemToDelete as ManualAsset);
        if (result.success) {
          setSettings((prev) => ({
            ...prev,
            manual_assets: prev.manual_assets.filter(
              (h) => h.id !== itemToDelete.id,
            ),
          }));
        }
      } else {
        result = await deleteCategoryAction(user.uid, itemToDelete as Category);
        if (result.success) {
          setSettings((prev) => ({
            ...prev,
            categories: prev.categories.filter((c) => c.id !== itemToDelete.id),
          }));
        }
      }

      if (result.success) {
        modalRef.current?.close();
      } else {
        showModal('Error', result.message, true);
      }
      setItemToDelete(null);
    });
  };

  const handleAddAsset = async () => {
    if (!user) return showModal('Error', 'User not authenticated.', true);

    const amountAsNumber = parseFloat(String(newAssetAmount));

    if (amountAsNumber <= 0 || !newAssetTicker || !newAssetCategory) {
      return showModal(
        'Input Error',
        'Please select a valid Ticker, amount, and category.',
        true,
      );
    }

    const newAssetData: Omit<ManualAsset, 'id'> = {
      ticker: newAssetTicker.trim().toUpperCase(),
      amount: amountAsNumber,
      category_id: newAssetCategory,
    };

    startTransition(async () => {
      const result = await addAssetAction(user.uid, newAssetData);

      if (result.success && result.data) {
        setSettings((prev) => ({
          ...prev,
          manual_assets: [...prev.manual_assets, result.data as ManualAsset],
        }));

        setNewAssetTicker('');
        setNewAssetAmount(0);
        setStockSearchQuery('');
        showModal('Success', result.message, false);
      } else {
        showModal('Error', result.message, true);
      }
    });
  };

  const filteredStockList = useMemo(() => {
    if (stockSearchQuery.length < 2) return [];
    const query = stockSearchQuery.toLowerCase();
    return allStockInfo
      .filter(
        (stock) =>
          stock.name.toLowerCase().includes(query) ||
          stock.symbol.toLowerCase().includes(query),
      )
      .slice(0, 50);
  }, [allStockInfo, stockSearchQuery]);

  const handleEditClick = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryTarget(category.target_percentage);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategoryTarget('');
  };

  const handleSaveEdit = async (oldCategory: Category) => {
    if (!user) return showModal('Error', 'User not authenticated.', true);

    const targetAsNumber = parseFloat(String(editCategoryTarget));
    const newCategoryData = {
      name: editCategoryName,
      target_percentage: targetAsNumber,
    };

    startTransition(async () => {
      const result = await updateCategoryAction(
        user.uid,
        oldCategory,
        newCategoryData,
      );

      if (result.success && result.data) {
        setSettings((prev) => ({
          ...prev,
          categories: prev.categories.map((cat) =>
            cat.id === oldCategory.id ? (result.data as Category) : cat,
          ),
        }));
        setEditingCategoryId(null);
        showModal('Success', result.message, false);
      } else {
        showModal('Error', result.message, true);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold">Settings</h1>
        <div className="skeleton h-32 w-full"></div>
        <div className="skeleton h-64 w-full"></div>
      </div>
    );
  }

  return (
    <>
      <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3
            className={`text-lg font-bold ${modalContent.isError ? 'text-error' : 'text-success'}`}
          >
            {modalContent.title}
          </h3>
          <p className="py-4">{modalContent.message}</p>
          <div className="modal-action">
            {itemToDelete ? (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setItemToDelete(null);
                    modalRef.current?.close();
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  className={`btn btn-error ${isProcessing ? 'btn-disabled' : ''}`}
                  onClick={handleConfirmDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <FiLoader className="loading loading-spinner" />
                  ) : (
                    'Yes, Delete'
                  )}
                </button>
              </>
            ) : (
              <form method="dialog">
                <button className="btn">Close</button>
              </form>
            )}
          </div>
        </div>
        <form
          method="dialog"
          className="modal-backdrop"
          onSubmit={() => setItemToDelete(null)}
        >
          <button>close</button>
        </form>
      </dialog>

      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold">Settings</h1>

        <div role="tablist" className="tabs tabs-lifted tabs-lg">
          <input
            type="radio"
            name="settings_tabs"
            role="tab"
            className="tab"
            aria-label="Connections"
          />
          <div
            role="tabpanel"
            className="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            <h2 className="mb-4 text-2xl font-semibold">API Connections</h2>
            <p>Kraken, Google Sheets, etc. connections will be managed here.</p>
          </div>

          <input
            type="radio"
            name="settings_tabs"
            role="tab"
            className="tab"
            aria-label="Assets"
            defaultChecked
          />
          <div
            role="tabpanel"
            className="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            <h2 className="mb-4 text-2xl font-semibold">Manual Assets</h2>
            <p className="text-base-content/70 mb-6">
              Add assets (like stocks) that are not automatically synced via an
              API.
            </p>

            <div className="bg-base-200 mb-6 grid grid-cols-1 items-end gap-4 rounded-lg p-4 md:grid-cols-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Ticker Symbol</span>
                </label>
                <div className="dropdown w-full">
                  <input
                    type="text"
                    placeholder="Search (e.g., Apple or AAPL)"
                    className="input input-bordered"
                    value={stockSearchQuery}
                    onChange={(e) => {
                      setStockSearchQuery(e.target.value);
                      setNewAssetTicker('');
                    }}
                    onFocus={() => setStockSearchQuery(stockSearchQuery || '')}
                  />

                  {filteredStockList.length > 0 && (
                    <ul
                      tabIndex={0}
                      className="dropdown-content menu bg-base-300 rounded-box z-10 max-h-60 w-full overflow-y-auto p-2 shadow"
                    >
                      {filteredStockList.map((stock) => (
                        <li key={stock.symbol}>
                          <a
                            onClick={() => {
                              setNewAssetTicker(stock.symbol);
                              setStockSearchQuery(stock.name);
                              (document.activeElement as HTMLElement)?.blur();
                            }}
                          >
                            <strong>{stock.name}</strong> ({stock.symbol})
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount (Quantity)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 10"
                  className="input input-bordered"
                  step={'any'}
                  value={newAssetAmount}
                  onChange={(e) =>
                    setNewAssetAmount(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Category</span>
                </label>
                <select
                  className="select select-bordered"
                  value={newAssetCategory}
                  onChange={(e) => setNewAssetCategory(e.target.value)}
                >
                  {settings.categories.length === 0 && (
                    <option disabled>Please add a category first</option>
                  )}
                  {settings.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary md:mt-9"
                onClick={handleAddAsset}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <FiLoader className="loading loading-spinner" />
                ) : (
                  'Add Asset'
                )}
              </button>
              <div className="text-success height-16 p-1 text-xs">
                {newAssetTicker && <div>Selected: {newAssetTicker}</div>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {settings.manual_assets.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-base-content/50 text-center italic"
                      >
                        No holdings added yet.
                      </td>
                    </tr>
                  )}
                  {settings.manual_assets.map((asset) => (
                    <tr key={asset.id} className="hover">
                      <td className="font-bold">{asset.ticker}</td>
                      <td>{asset.amount}</td>
                      <td>
                        {settings.categories.find(
                          (c) => c.id === asset.category_id,
                        )?.name || 'N/A'}
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-ghost btn-square btn-sm"
                          onClick={() => handleDeleteItem(asset)}
                          disabled={isProcessing}
                        >
                          <FiTrash2 className="text-error" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <input
            type="radio"
            name="settings_tabs"
            role="tab"
            className="tab"
            aria-label="Categories"
            defaultChecked
          />
          <div
            role="tabpanel"
            className="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            <h2 className="mb-4 text-2xl font-semibold">Category Management</h2>
            <p className="text-base-content/70 mb-4">
              Manage the categories used for portfolio grouping.
            </p>

            <div className="mb-6">
              {totalTargetPercentage > 100 && (
                <div role="alert" className="alert alert-error">
                  <FiAlertCircle />
                  <span>
                    Error: Total target is {totalTargetPercentage}%. This is
                    over the 100% limit.
                  </span>
                </div>
              )}
              {totalTargetPercentage < 100 && totalTargetPercentage > 0 && (
                <div role="alert" className="alert alert-info">
                  <FiInfo />
                  <span>
                    Notice: Total target is {totalTargetPercentage}%. You still
                    have {100 - totalTargetPercentage}% left to assign.
                  </span>
                </div>
              )}
              {totalTargetPercentage === 100 && (
                <div role="alert" className="alert alert-success">
                  <FiCheckCircle />
                  <span>Success! Your target allocation is exactly 100%.</span>
                </div>
              )}
            </div>

            <div className="bg-base-200 mb-6 grid grid-cols-1 items-end gap-4 rounded-lg p-4 md:grid-cols-4">
              <div className="form-control">
                <label className="label mb-4">
                  <span className="label-text">New Category Name:</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Growth, Crypto, High Risk"
                  className="input input-bordered"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <div className="form-control">
                <label className="label mb-4">
                  <span className="label-text">Target %:</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 60"
                  className="input input-bordered"
                  value={newCategoryTarget}
                  onChange={(e) =>
                    setNewCategoryTarget(parseInt(e.target.value))
                  }
                  step="any"
                  min="0"
                  max="100"
                  disabled={isProcessing}
                />
              </div>
              <div className="form-control justify-end">
                <button
                  className="btn btn-primary" // Buton tüm satırı kaplasın
                  onClick={handleAddCategory}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <FiLoader className="loading loading-spinner" />
                  ) : (
                    'Add Category'
                  )}
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {settings.categories.length === 0 && (
                <span className="text-base-content/50 italic">
                  No categories added yet.
                </span>
              )}

              {settings.categories.map((cat) => {
                const assetsInCategory = settings.manual_assets.filter(
                  (asset) => asset.category_id === cat.id,
                );

                return (
                  <div key={cat.id} className="card bg-base-200 shadow-md">
                    {editingCategoryId === cat.id ? (
                      <div className="card-body p-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Category Name</span>
                          </label>
                          <input
                            type="text"
                            className="input input-sm"
                            value={editCategoryName}
                            onChange={(e) =>
                              setEditCategoryName(e.target.value)
                            }
                          />
                        </div>
                        <div className="form-control mt-2">
                          <label className="label">
                            <span className="label-text">Target %</span>
                          </label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={editCategoryTarget}
                            onChange={(e) =>
                              setEditCategoryTarget(e.target.value)
                            }
                            step="any"
                          />
                        </div>
                        <div className="card-actions mt-4 justify-end">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleCancelEdit}
                            disabled={isProcessing}
                          >
                            <FiXCircle /> Cancel
                          </button>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleSaveEdit(cat)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <FiLoader className="loading loading-spinner" />
                            ) : (
                              <FiSave />
                            )}{' '}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="card-title text-lg">
                            {cat.name}
                            {cat.target_percentage && (
                              <span className="badge badge-accent ml-2">
                                {cat.target_percentage}%
                              </span>
                            )}
                          </h3>
                          <div
                            className="flex gap-1"
                            style={{ opacity: isProcessing ? 0.5 : 1 }}
                          >
                            <button
                              className="btn btn-ghost btn-square btn-sm"
                              onClick={() => handleEditClick(cat)}
                              disabled={isProcessing}
                              title={`Edit ${cat.name}`}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="btn btn-ghost btn-square btn-sm"
                              onClick={() => handleDeleteItem(cat)}
                              disabled={isProcessing}
                              title={`Delete ${cat.name}`}
                            >
                              <FiTrash2 className="text-error" />
                            </button>
                          </div>
                        </div>

                        <p className="text-base-content/50 -mt-2 mb-4 text-xs">
                          {assetsInCategory.length} asset(s) in this category.
                        </p>

                        <div className="text-base-content/50 -mt-2 mb-4 overflow-x-auto">
                          <table className="table-xs table">
                            <thead>
                              <tr>
                                <th>Symbol</th>
                                <th className="text-right">Amount</th>
                                <th className="text-right"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {assetsInCategory.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="text-base-content/50 text-center italic"
                                  >
                                    No assets assigned.
                                  </td>
                                </tr>
                              )}

                              {assetsInCategory.map((asset) => (
                                <tr
                                  key={asset.id}
                                  className="hover:bg-base-300 cursor-pointer transition-colors"
                                >
                                  <td className="font-bold">{asset.ticker}</td>
                                  <td className="text-right">{asset.amount}</td>
                                  <td className="text-right">
                                    <button
                                      className="btn btn-ghost btn-square btn-xs"
                                      onClick={() => handleDeleteItem(asset)} // handleDeleteItem (genel)
                                      disabled={isProcessing}
                                      title={`Delete Asset ${asset.ticker}`}
                                    >
                                      <FiTrash2 className="text-error opacity-50 hover:opacity-100" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
