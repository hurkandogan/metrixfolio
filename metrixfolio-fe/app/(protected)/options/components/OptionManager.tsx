'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { 
    addOptionAction, 
    getOptionsAction, 
    updateOptionAction, 
    deleteOptionAction 
} from '@/actions/options';
import { OptionPosition, OptionType } from '@/types/options';
import { 
    FiPlus, 
    FiTrash2, 
    FiEdit2, 
    FiDollarSign, 
    FiTrendingUp, 
    FiTrendingDown,
    FiInfo,
    FiCalendar,
    FiChevronUp,
    FiChevronDown
} from 'react-icons/fi';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function OptionManager() {
  const { user } = useAuth();
  const modalRef = useRef<HTMLDialogElement>(null);
  
  const [options, setOptions] = useState<OptionPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof OptionPosition, direction: 'asc' | 'desc' } | null>(null);

  const [formData, setFormData] = useState({
    symbol: '',
    type: 'BUY_CALL' as OptionType,
    quantity: '1',
    buy_date: '',
    sell_date: '',
    buy_price: '',
    sell_price: '',
    target: '',
    note: '',
  });

  const loadOptions = async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await getOptionsAction(user.uid);
    setOptions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOptions();
  }, [user]);

  const stats = useMemo(() => {
    let totalOpenValue = 0;
    let totalPnL = 0;

    options.forEach(opt => {
        const isLong = opt.type.startsWith('BUY');
        const qty = opt.quantity || 1;
        const buyPrice = opt.buy_price || 0;
        const sellPrice = opt.sell_price || 0;
        const isClosed = !!opt.buy_date && !!opt.sell_date;
        
        if (isClosed) {
            // Realized PnL
            totalPnL += (sellPrice - buyPrice) * qty;
        } else {
            // Open position value (Cost Basis for Long, Initial Credit for Short)
            if (isLong && !opt.sell_date) {
                totalOpenValue += buyPrice * qty;
            } else if (!isLong && !opt.buy_date) {
                totalOpenValue += sellPrice * qty;
            }
        }
    });

    return { totalOpenValue, totalPnL };
  }, [options]);

  const filteredOptions = useMemo(() => {
    let result = [...options];
    if (filter !== 'ALL') {
      result = result.filter(opt => {
          const isClosed = opt.buy_date && opt.sell_date;
          return filter === 'CLOSED' ? isClosed : !isClosed;
      });
    }

    if (sortConfig) {
        result.sort((a, b) => {
            const aClosed = !!(a.buy_date && a.sell_date);
            const bClosed = !!(b.buy_date && b.sell_date);
            if (aClosed !== bClosed) return aClosed ? 1 : -1; // Open on top

            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    } else {
        // Default sort: Open first, then by opening date descending
        result.sort((a, b) => {
            const aClosed = !!(a.buy_date && a.sell_date);
            const bClosed = !!(b.buy_date && b.sell_date);
            
            if (aClosed !== bClosed) return aClosed ? 1 : -1; // Open on top
            
            const aEntry = a.type.startsWith('BUY') ? (a.buy_date || '') : (a.sell_date || '');
            const bEntry = b.type.startsWith('BUY') ? (b.buy_date || '') : (b.sell_date || '');
            
            return bEntry.localeCompare(aEntry); // Most recent first
        });
    }

    return result;
  }, [options, filter, sortConfig]);

  const handleSort = (key: keyof OptionPosition) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (key: keyof OptionPosition) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />;
  };

  const handleOpenModal = (opt?: OptionPosition) => {
    if (opt) {
      setEditingId(opt.id);
      setFormData({
        symbol: opt.symbol,
        type: opt.type,
        quantity: opt.quantity?.toString() || '1',
        buy_date: opt.buy_date || '',
        sell_date: opt.sell_date || '',
        buy_price: opt.buy_price?.toString() || '',
        sell_price: opt.sell_price?.toString() || '',
        target: opt.target,
        note: opt.note,
      });
    } else {
      setEditingId(null);
      setFormData({ 
        symbol: '', 
        type: 'BUY_CALL', 
        quantity: '1',
        buy_date: '', 
        sell_date: '', 
        buy_price: '', 
        sell_price: '', 
        target: '', 
        note: '' 
      });
    }
    modalRef.current?.showModal();
  };

  const handleCloseModal = () => {
    modalRef.current?.close();
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    const payload: Omit<OptionPosition, 'id' | 'created_at'> = {
        symbol: formData.symbol.toUpperCase(),
        type: formData.type,
        quantity: parseFloat(formData.quantity) || 1,
        buy_date: formData.buy_date || null,
        sell_date: formData.sell_date || null,
        buy_price: formData.buy_price ? parseFloat(formData.buy_price) : null,
        sell_price: formData.sell_price ? parseFloat(formData.sell_price) : null,
        target: formData.target,
        note: formData.note,
    };

    let res;
    if (editingId) {
      res = await updateOptionAction(user.uid, editingId, payload);
    } else {
      res = await addOptionAction(user.uid, payload);
    }

    if (res.success) {
      loadOptions();
      handleCloseModal();
    } else {
      alert('Error: ' + res.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure?')) return;
    await deleteOptionAction(user.uid, id);
    loadOptions();
  };

  const calculateChange = (opt: OptionPosition) => {
    const isClosed = opt.buy_date && opt.sell_date;
    if (!isClosed) return { abs: 0, percent: 0 };
    
    const qty = opt.quantity || 1;
    const bPrice = opt.buy_price || 0;
    const sPrice = opt.sell_price || 0;
    
    const abs = (sPrice - bPrice) * qty;
    const isLong = opt.type.startsWith('BUY');
    const base = isLong ? bPrice : sPrice;
    const percent = base !== 0 ? (abs / (base * qty)) * 100 : 0;
    
    return { abs, percent };
  };

  if (isLoading) return <div className="skeleton h-96 w-full"></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h1 className="text-3xl font-bold">Options</h1>
          <p className="text-base-content/70">Track your option trades and PnL</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={() => handleOpenModal()}>
          <FiPlus /> Add Option
        </button>
      </div>

      <div className="flex justify-center">
        <div className="join bg-base-100 border border-base-200">
          <button className={`join-item btn btn-sm px-6 ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('ALL')}>All</button>
          <button className={`join-item btn btn-sm px-6 ${filter === 'OPEN' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('OPEN')}>Open</button>
          <button className={`join-item btn btn-sm px-6 ${filter === 'CLOSED' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('CLOSED')}>Closed</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="stats bg-base-100 border-base-200 border shadow">
          <div className="stat">
            <div className="stat-figure text-primary">
              <FiDollarSign size={32} />
            </div>
            <div className="stat-title">Open Position Value</div>
            <div className="stat-value text-3xl">{usdFormatter.format(stats.totalOpenValue * 100)}</div>
          </div>
        </div>
        <div className="stats bg-base-100 border-base-200 border shadow">
          <div className="stat">
            <div className="stat-figure text-secondary">
              {stats.totalPnL >= 0 ? <FiTrendingUp size={32} className="text-success" /> : <FiTrendingDown size={32} className="text-error" />}
            </div>
            <div className="stat-title">Total PnL</div>
            <div className="stat-value text-3xl" style={{ color: stats.totalPnL >= 0 ? '#22c55e' : '#ef4444' }}>
                {(stats.totalPnL >= 0 ? '+' : '') + usdFormatter.format(stats.totalPnL * 100)}
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border-base-200 border shadow-xl">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="bg-base-200/50">
                <th className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('buy_date')}>Dates {renderSortArrow('buy_date') || renderSortArrow('sell_date')}</th>
                <th className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('symbol')}>Type & Symbol {renderSortArrow('symbol')}</th>
                <th className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('quantity')}>Qty {renderSortArrow('quantity')}</th>
                <th className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('target')}>Target & Note {renderSortArrow('target')}</th>
                <th className="text-right cursor-pointer select-none whitespace-nowrap text-xs">Prices (B/S)</th>
                <th className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('created_at')}>PnL / Change {renderSortArrow('created_at')}</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOptions.map((opt) => {
                const { abs, percent } = calculateChange(opt);
                const isClosed = opt.buy_date && opt.sell_date;
                const rowBg = isClosed ? (abs >= 0 ? 'bg-success/5' : 'bg-error/5') : '';
                
                return (
                  <tr key={opt.id} className={`${rowBg} hover:bg-base-200/40 transition-colors`}>
                    <td className="text-[10px] py-1">
                        <div className="flex flex-col gap-0.5 min-w-[85px]">
                            {opt.type.startsWith('BUY') ? (
                                <>
                                    <span className="flex items-center gap-1"><span className="badge badge-xs h-3 min-h-0 badge-info text-[8px] px-0.5">B</span> {opt.buy_date || '-'}</span>
                                    <span className="flex items-center gap-1 opacity-70"><span className="badge badge-xs h-3 min-h-0 badge-warning text-[8px] px-0.5">S</span> {opt.sell_date || '-'}</span>
                                </>
                            ) : (
                                <>
                                    <span className="flex items-center gap-1"><span className="badge badge-xs h-3 min-h-0 badge-warning text-[8px] px-0.5">S</span> {opt.sell_date || '-'}</span>
                                    <span className="flex items-center gap-1 opacity-70"><span className="badge badge-xs h-3 min-h-0 badge-info text-[8px] px-0.5">B</span> {opt.buy_date || '-'}</span>
                                </>
                            )}
                        </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold ${opt.type.startsWith('BUY') ? 'text-primary' : 'text-secondary'}`}>{opt.type}</span>
                        <span className="font-bold">{opt.symbol}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono text-sm">{opt.quantity || 1}</td>
                    <td className="max-w-xs whitespace-normal">
                        <div className="flex flex-col">
                           <span className="text-sm font-semibold">{opt.target}</span>
                           <span className="text-xs opacity-60 italic">{opt.note}</span>
                        </div>
                    </td>
                    <td className="text-right font-mono text-sm">
                      <div className="flex flex-col">
                        <span className="text-info">B: {opt.buy_price ? usdFormatter.format(opt.buy_price) : '-'}</span>
                        <span className="text-warning">S: {opt.sell_price ? usdFormatter.format(opt.sell_price) : '-'}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono">
                      {isClosed ? (
                          <div className="flex flex-col">
                            <span className={`font-bold ${abs >= 0 ? 'text-success' : 'text-error'}`}>
                                {abs >= 0 ? '+' : ''}{usdFormatter.format(abs * 100)}
                            </span>
                            <span className={`text-xs ${abs >= 0 ? 'text-success' : 'text-error'}`}>
                                {abs >= 0 ? '+' : ''}{percent.toFixed(2)}%
                            </span>
                          </div>
                      ) : (
                          <span className="badge badge-ghost badge-sm text-xs italic">Open</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button onClick={() => handleOpenModal(opt)} className="btn btn-ghost btn-xs text-primary mr-1" title="Edit">
                        <FiEdit2 />
                      </button>
                      <button onClick={() => handleDelete(opt.id)} className="btn btn-ghost btn-xs text-error" title="Delete">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {options.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center opacity-50">No options found. Add your first trade!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle backdrop-blur-sm">
        <div className="modal-box max-w-2xl">
          <h3 className="mb-6 text-xl font-bold flex items-center gap-2">
            {editingId ? <FiEdit2 className="text-primary" /> : <FiPlus className="text-primary" />}
            {editingId ? 'Edit Option Position' : 'Add New Option Position'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Symbol</span></label>
                    <input type="text" className="input input-bordered focus:input-primary uppercase" placeholder="e.g. SPY 450C" required value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} />
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Option Type</span></label>
                    <select className="select select-bordered focus:select-primary" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as OptionType })}>
                        <option value="BUY_CALL">Buy Call (Long)</option>
                        <option value="BUY_PUT">Buy Put (Long)</option>
                        <option value="SELL_CALL">Sell Call (Short)</option>
                        <option value="SELL_PUT">Sell Put (Short)</option>
                    </select>
                </div>
            </div>

            <div className="form-control">
                <label className="label"><span className="label-text font-semibold text-primary">Quantity</span></label>
                <input type="number" step="1" min="1" className="input input-bordered focus:input-primary" required value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-base-200/50 rounded-xl">
                <div className="space-y-4">
                    <div className="form-control">
                        <label className="label"><span className="label-text flex items-center gap-1 font-semibold text-info"><FiCalendar /> Buy Date</span></label>
                        <input type="date" className="input input-bordered input-sm" value={formData.buy_date} onChange={(e) => setFormData({ ...formData, buy_date: e.target.value })} />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text flex items-center gap-1 font-semibold text-info"><FiDollarSign /> Buy Price</span></label>
                        <input type="number" step="0.01" className="input input-bordered input-sm" placeholder="Price paid" value={formData.buy_price} onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })} />
                    </div>
                </div>
                <div className="space-y-4 border-l border-base-300 pl-6">
                    <div className="form-control">
                        <label className="label"><span className="label-text flex items-center gap-1 font-semibold text-warning"><FiCalendar /> Sell Date</span></label>
                        <input type="date" className="input input-bordered input-sm" value={formData.sell_date} onChange={(e) => setFormData({ ...formData, sell_date: e.target.value })} />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text flex items-center gap-1 font-semibold text-warning"><FiDollarSign /> Sell Price</span></label>
                        <input type="number" step="0.01" className="input input-bordered input-sm" placeholder="Price received" value={formData.sell_price} onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })} />
                    </div>
                </div>
            </div>

            <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Target Price / Level</span></label>
                <input type="text" className="input input-bordered focus:input-primary" placeholder="e.g. 2.50 or Break even at 440" value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} />
            </div>

            <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Note</span></label>
                <textarea className="textarea textarea-bordered focus:textarea-primary h-24" placeholder="Trade plan, reasons, etc." value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })}></textarea>
            </div>

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>Cancel</button>
              <button type="submit" className="btn btn-primary px-8" disabled={isSubmitting}>
                {isSubmitting && <span className="loading loading-spinner"></span>}
                {editingId ? 'Save Changes' : 'Open Trade'}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={handleCloseModal}>close</button>
        </form>
      </dialog>
    </div>
  );
}
