'use client';

import { useState, useRef } from 'react';
import { addManualPositionAction } from '@/actions/manual-positions';
import { useAuth } from '@/context/AuthProvider';
import { Category } from '@/types/settings';
import { FiPlus, FiSave } from 'react-icons/fi';

interface Props {
  categories: Category[];
  onSuccess: () => void;
}

export default function AddManualAssetModal({ categories, onSuccess }: Props) {
  const { user } = useAuth();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);

  //TODO: Currency set to USD for now, add option to change it
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    amount: '',
    avg_cost: '',
    currency: 'USD',
    category_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const res = await addManualPositionAction(user.uid, {
      symbol: form.symbol,
      name: form.name,
      amount: parseFloat(form.amount),
      avg_cost: parseFloat(form.avg_cost),
      currency: form.currency,
      category_id: form.category_id || 'uncategorized',
    });

    if (res.success) {
      modalRef.current?.close();
      setForm({
        symbol: '',
        name: '',
        amount: '',
        avg_cost: '',
        currency: 'USD',
        category_id: '',
      });
      onSuccess(); // Listeyi tazele
    } else {
      alert('Hata: ' + res.message);
    }
    setLoading(false);
  };

  return (
    <>
      <button
        className="btn btn-outline btn-primary gap-2"
        onClick={() => modalRef.current?.showModal()}
      >
        <FiPlus /> Add Position
      </button>

      <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="mb-4 text-lg font-bold">Add Manual Asset</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Symbol</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. XAU"
                  className="input input-bordered uppercase"
                  value={form.symbol}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      symbol: e.target.value.toLocaleUpperCase(),
                    })
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
                  placeholder="Gold Bar"
                  className="input input-bordered"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                  value={form.avg_cost}
                  onChange={(e) =>
                    setForm({ ...form, avg_cost: e.target.value })
                  }
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
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
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
                  className="select select-bordered"
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({ ...form, category_id: e.target.value })
                  }
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => modalRef.current?.close()}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Asset'}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Close</button>
        </form>
      </dialog>
    </>
  );
}
