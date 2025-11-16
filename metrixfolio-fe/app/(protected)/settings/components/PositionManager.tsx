'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { Category, UserSettings, CategoryType } from '@/types/settings';
// StockInfo tipini 'positions.ts'ten alıyoruz
import { Position, StockInfo } from '@/types/positions';
import { addPositionAction } from '../actions';
import { FiLoader, FiTrash2 } from 'react-icons/fi';
// 'useStockList' hook'unu (dün 17:23'te oluşturduğumuz) import ediyoruz
import { useStockList } from '@/hooks/useStockList';
import { Timestamp } from 'firebase/firestore'; // İstemci (client-side) Timestamp

// --- Prop Arayüzü (Patrondan gelenler) ---
interface PositionManagerProps {
  user: any;
  settings: UserSettings;
  openPositions: Position[];
  showModal: (title: string, message: string, isError?: boolean) => void;
  onClosePosition: (item: Position) => void; // "Kapat" butonuna basıldığında Patron'u çağırır
  isProcessing: boolean;
}

export function PositionManager({
  user,
  settings,
  openPositions,
  showModal,
  onClosePosition,
  isProcessing,
}: PositionManagerProps) {
  // --- STATE'LER (Sadece Pozisyon Ekleme Formu için) ---
  const [isAdding, startAddTransition] = useTransition();

  // Form state'leri
  const [newAssetAmount, setNewAssetAmount] = useState<number | string>('');
  // (YENİ) 'cost_per_unit' yerine 'total_cost'
  const [newAssetTotalCost, setNewAssetTotalCost] = useState<number | string>(
    '',
  );
  const [newAssetDate, setNewAssetDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  // Kategori
  const [newAssetCategory, setNewAssetCategory] = useState<string>('');

  // (YENİ) Seçilen kategorinin tipini (ASSET/CASH) tutan state
  const [selectedCategoryType, setSelectedCategoryType] =
    useState<CategoryType | null>(null);

  // ASSET tipi için state'ler
  const [newAssetTicker, setNewAssetTicker] = useState(''); // örn: "NASDAQ:AAPL"
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // CASH tipi için state'ler
  const [newCashCurrency, setNewCashCurrency] = useState('EUR'); // Varsayılan EUR

  // Hisse listesini API'den çeken hook
  const { stockList, isLoading: isLoadingStockList } = useStockList();

  // --- Kategori seçimi ---
  useEffect(() => {
    // Kategori listesi varsa ve henüz bir kategori seçilmemişse, ilkini seç
    if (settings.categories.length > 0 && !newAssetCategory) {
      const firstCategory = settings.categories[0];
      setNewAssetCategory(firstCategory.id);
      // ve o kategorinin TİPİNİ de ayarla
      setSelectedCategoryType(firstCategory.type);
    }
  }, [settings.categories, newAssetCategory]);

  // Kategori <select> 'i değiştiğinde, TİPİ de güncelle
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    const category = settings.categories.find((c) => c.id === categoryId);
    setNewAssetCategory(categoryId);
    setSelectedCategoryType(category ? category.type : null);

    // Kategori değiştiğinde, Ticker/Currency seçimlerini sıfırla
    setNewAssetTicker('');
    setStockSearchQuery('');
    setNewCashCurrency('EUR');
  };

  // Arama kutusu için filtreleme
  const filteredStockList = useMemo(() => {
    if (stockSearchQuery.length < 2) return [];
    const query = stockSearchQuery.toLowerCase();
    return stockList
      .filter(
        (stock) =>
          stock.name.toLowerCase().includes(query) ||
          stock.symbol.toLowerCase().includes(query),
      )
      .slice(0, 50);
  }, [stockList, stockSearchQuery]);

  // --- POZİSYON EKLEME (ADD) (GÜNCELLENDİ: 'total_cost' ile) ---
  const handleAddPosition = async () => {
    if (!user || !selectedCategoryType)
      return showModal(
        'Error',
        'User not authenticated or category not selected.',
        true,
      );

    const amountAsNumber = parseFloat(String(newAssetAmount));
    let totalCostAsNumber = parseFloat(String(newAssetTotalCost));

    if (amountAsNumber <= 0) {
      return showModal('Input Error', 'Amount must be greater than 0.', true);
    }

    let positionData: Omit<Position, 'id' | 'user_id'>;

    // --- Kategori Tipine Göre Veriyi Hazırla ---
    if (selectedCategoryType === 'ASSET') {
      if (!newAssetTicker)
        return showModal('Input Error', 'Please select a Ticker.', true);
      if (totalCostAsNumber <= 0)
        return showModal(
          'Input Error',
          'Total Cost must be greater than 0 for Assets.',
          true,
        );

      positionData = {
        category_id: newAssetCategory,
        category_type: 'ASSET',
        amount: amountAsNumber,
        date: Timestamp.fromDate(new Date(newAssetDate)),
        ticker: newAssetTicker.trim().toUpperCase(),
        currency: undefined, // CASH değil
        // --- DOĞRU MİMARİ (SENİN FİKRİN) ---
        // Frontend'de hesaplama YOK. Ham 'total_cost'u yolla.
        total_cost: totalCostAsNumber,
        // --- Bitti ---
        cost_currency: newAssetTicker.startsWith('ETR:') ? 'EUR' : 'USD', // (Basit varsayım)
      };
    } else if (selectedCategoryType === 'CASH') {
      // Nakit için, 'Total Cost' 'Amount' ile aynıdır
      totalCostAsNumber = amountAsNumber;

      positionData = {
        category_id: newAssetCategory,
        category_type: 'CASH',
        amount: amountAsNumber,
        date: Timestamp.fromDate(new Date(newAssetDate)),
        ticker: undefined, // ASSET değil
        currency: newCashCurrency.trim().toUpperCase(),
        total_cost: totalCostAsNumber, // 'total_cost' 'amount'a eşit
        cost_currency: newCashCurrency.trim().toUpperCase(),
      };
    } else {
      return showModal('Input Error', 'Invalid category type.', true);
    }
    // --- Bitti ---

    startAddTransition(async () => {
      // Server Action'a 'total_cost' içeren yeni objeyi yolla
      const result = await addPositionAction(user.uid, positionData);

      if (result.success) {
        // Formu temizle ('onSnapshot' UI'ı günceller)
        setNewAssetTicker('');
        setNewAssetAmount('');
        setNewAssetTotalCost('');
        setStockSearchQuery('');
        setNewCashCurrency('EUR');
        showModal('Success', result.message, false);
      } else {
        showModal('Error', result.message, true);
      }
    });
  };

  // 'isProcessing' (global) veya 'isAdding' (lokal) meşgulse butonları kilitle
  const isBusy = isProcessing || isAdding;

  return (
    <div
      role="tabpanel"
      className="tab-content bg-base-100 border-base-300 rounded-box p-6"
    >
      <h2 className="mb-4 text-2xl font-semibold">Positions Management</h2>
      <p className="text-base-content/70 mb-6">
        Add or close your manual asset (stock, crypto) and cash positions.
      </p>

      {/* --- Ekleme Formu --- */}
      <div className="bg-base-200 mb-6 grid grid-cols-1 items-end gap-4 rounded-lg p-4 md:grid-cols-3 lg:grid-cols-5">
        {/* 1. Kategori Seçimi (HER ZAMAN GÖRÜNÜR) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Category</span>
          </label>
          <select
            className="select select-bordered"
            value={newAssetCategory}
            onChange={handleCategoryChange} // <-- Kategori TİPİNİ de ayarlar
            disabled={isBusy}
          >
            {settings.categories.length === 0 && (
              <option disabled>Please add a category first</option>
            )}
            {settings.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type})
              </option>
            ))}
          </select>
        </div>

        {/* --- 2. KOŞULLU (CONDITIONAL) FORMLAR --- */}

        {/* EĞER TİP "ASSET" İSE (Hisse/Kripto) */}
        {selectedCategoryType === 'ASSET' && (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Ticker Symbol</span>
              </label>
              <div className="dropdown w-full">
                <input
                  type="text"
                  placeholder={
                    isLoadingStockList
                      ? 'Loading stocks...'
                      : 'Search Ticker...'
                  }
                  className="input input-bordered w-full"
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  disabled={isLoadingStockList || isBusy} // Yüklenirken veya işlem yaparken kilitle
                />
                {newAssetTicker && (
                  <div className="text-success p-1 text-xs">
                    Selected: {newAssetTicker}
                  </div>
                )}

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
                <span className="label-text">Amount (e.g., 1.35)</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 1.35"
                className="input input-bordered"
                step="any"
                value={newAssetAmount}
                onChange={(e) => setNewAssetAmount(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Total Cost (e.g., 150.00)</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 150.00"
                className="input input-bordered"
                value={newAssetTotalCost}
                onChange={(e) => setNewAssetTotalCost(e.target.value)}
                step="any"
                disabled={isBusy}
              />
            </div>
          </>
        )}

        {/* EĞER TİP "CASH" İSE (Nakit) */}
        {selectedCategoryType === 'CASH' && (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Currency</span>
              </label>
              <input
                type="text"
                placeholder="e.g., EUR, USD"
                className="input input-bordered"
                value={newCashCurrency}
                onChange={(e) => setNewCashCurrency(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount (e.g., 500.00)</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 500.00"
                className="input input-bordered"
                step="any"
                value={newAssetAmount}
                onChange={(e) => {
                  setNewAssetAmount(e.target.value);
                  setNewAssetTotalCost(e.target.value); // Total Cost'u Amount ile eşitle
                }}
                disabled={isBusy}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Total Cost (Amount)</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={newAssetAmount}
                disabled
              />
            </div>
          </>
        )}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Date</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={newAssetDate}
            onChange={(e) => setNewAssetDate(e.target.value)}
            disabled={isBusy}
          />
        </div>

        <button
          className="btn btn-primary md:col-span-full md:col-start-1" // Formun tamamını kaplasın
          onClick={handleAddPosition}
          disabled={isBusy}
        >
          {isAdding ? (
            <FiLoader className="loading loading-spinner" />
          ) : (
            'Add Position'
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Total Cost</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {openPositions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-base-content/50 text-center italic"
                >
                  No open positions.
                </td>
              </tr>
            )}
            {openPositions.map((pos) => (
              <tr key={pos.id} className="hover">
                <td className="font-bold">{pos.ticker || pos.currency}</td>
                <td>{pos.amount}</td>
                <td>
                  {settings.categories.find((c) => c.id === pos.category_id)
                    ?.name || <span className="text-error italic">N/A</span>}
                </td>
                <td>
                  {pos.total_cost.toFixed(2)} {pos.cost_currency}
                </td>
                <td>
                  {(pos.date as Timestamp).toDate().toLocaleDateString('de-DE')}
                </td>
                <td className="text-right">
                  <button
                    className="btn btn-ghost btn-square btn-sm"
                    onClick={() => onClosePosition(pos)} // Patron'u (page.tsx) çağır
                    disabled={isProcessing}
                    title={`Close ${pos.ticker || pos.currency}`}
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
  );
}
