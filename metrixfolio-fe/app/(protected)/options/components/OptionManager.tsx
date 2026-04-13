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
    FiCalendar
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

  const [formData, setFormData] = useState({
    symbol: '',
    type: 'BUY_CALL' as OptionType,
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
        const buyPrice = opt.buy_price || 0;
        const sellPrice = opt.sell_price || 0;
        
        // PnL = Profit = (Cash In - Cash Out)
        // For Long: Sell (In) - Buy (Out)
        // For Short: Sell (In) - Buy (Out)
        // It's technically the same if we consider signs, but let's be explicit.
        const pnl = (sellPrice && buyPrice) ? (sellPrice - buyPrice) : 0;
        totalPnL += pnl;

        // Open position value
        if (isLong && !opt.sell_price) {
            totalOpenValue += buyPrice;
        } else if (!isLong && !opt.buy_price) {
            totalOpenValue += sellPrice;
        }
    });

    return { totalOpenValue, totalPnL };
  }, [options]);

  const handleOpenModal = (opt?: OptionPosition) => {
    if (opt) {
      setEditingId(opt.id);
      setFormData({
        symbol: opt.symbol,
        type: opt.type,
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
        buy_date: new Date().toISOString().split('T')[0], 
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
    if (!opt.buy_price || !opt.sell_price) return { abs: 0, percent: 0 };
    const abs = opt.sell_price - opt.buy_price;
    const isLong = opt.type.startsWith('BUY');
    const base = isLong ? opt.buy_price : opt.sell_price;
    const percent = (abs / base) * 100;
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="stats bg-base-100 border-base-200 border shadow">
          <div className="stat">
            <div className="stat-figure text-primary">
              <FiDollarSign size={32} />
            </div>
            <div className="stat-title">Open Position Value</div>
            <div className="stat-value text-3xl">{usdFormatter.format(stats.totalOpenValue)}</div>
          </div>
        </div>
        <div className="stats bg-base-100 border-base-200 border shadow">
          <div className="stat">
            <div className="stat-figure text-secondary">
              {stats.totalPnL >= 0 ? <FiTrendingUp size={32} className="text-success" /> : <FiTrendingDown size={32} className="text-error" />}
            </div>
            <div className="stat-title">Total PnL</div>
            <div className="stat-value text-3xl" style={{ color: stats.totalPnL >= 0 ? '#22c55e' : '#ef4444' }}>
                {(stats.totalPnL >= 0 ? '+' : '') + usdFormatter.format(stats.totalPnL)}
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border-base-200 border shadow-xl">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="bg-base-200/50">
                <th>Dates</th>
                <th>Type & Symbol</th>
                <th>Target & Note</th>
                <th className="text-right">Prices</th>
                <th className="text-right">PnL / Change</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt) => {
                const { abs, percent } = calculateChange(opt);
                const isClosed = opt.buy_price && opt.sell_price;
                const rowBg = isClosed ? (abs >= 0 ? 'bg-success/5' : 'bg-error/5') : '';
                
                return (
                  <tr key={opt.id} className={`${rowBg} hover:bg-base-200/40 transition-colors`}>
                    <td className="text-xs">
                        <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1"><span className="badge badge-xs badge-info">B</span> {opt.buy_date || '-'}</span>
                            <span className="flex items-center gap-1"><span className="badge badge-xs badge-warning">S</span> {opt.sell_date || '-'}</span>
                        </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold ${opt.type.startsWith('BUY') ? 'text-primary' : 'text-secondary'}`}>{opt.type}</span>
                        <span className="font-bold">{opt.symbol}</span>
                      </div>
                    </td>
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
                                {abs >= 0 ? '+' : ''}{usdFormatter.format(abs)}
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
