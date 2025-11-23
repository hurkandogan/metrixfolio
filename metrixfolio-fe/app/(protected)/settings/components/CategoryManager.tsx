'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import {
  addCategoryAction,
  getCategoriesAction,
  deleteCategoryAction,
} from '@/actions/categories';
import { Category } from '@/types/settings';
import { FiTrash2 } from 'react-icons/fi';

export default function CategoryManager() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [target, setTarget] = useState(0);
  const [type, setType] = useState('ASSET');
  const [loading, setLoading] = useState(false);

  // Yükleme
  useEffect(() => {
    if (user) {
      getCategoriesAction(user.uid).then(setCategories);
    }
  }, [user]);

  // Ekleme
  const handleAdd = async () => {
    if (!user) return;
    setLoading(true);

    const res = await addCategoryAction(user.uid, name, target, type);

    if (res.success && res.category) {
      setCategories([...categories, res.category]);
      setName('');
      setTarget(0);
    } else {
      alert('Hata: ' + res.message);
    }
    setLoading(false);
  };

  // Silme
  const handleDelete = async (cat: Category) => {
    if (!user || !confirm('Silmek istediğine emin misin?')) return;

    const res = await deleteCategoryAction(user.uid, cat);
    if (res.success) {
      setCategories(categories.filter((c) => c.id !== cat.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* FORM */}
      <div className="bg-base-200 flex items-end gap-4 rounded-lg p-4">
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Category Name</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered"
            placeholder="Growth"
          />
        </div>

        <div className="form-control w-24">
          <label className="label">
            <span className="label-text">Target %</span>
          </label>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="input input-bordered"
          />
        </div>

        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Type</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="select select-bordered"
          >
            <option value="ASSET">Stocks / ETF</option>
            <option value="CRYPTO">Crypto</option>
            <option value="CASH">Cash</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Category'}
        </button>
      </div>

      {/* LİSTE */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="card bg-base-100 border-base-300 border shadow-md"
          >
            <div className="card-body flex-row items-center justify-between p-4">
              <div>
                <h3 className="font-bold">{cat.name}</h3>
                <div className="text-xs opacity-70">
                  {cat.type} • Target: {cat.target_percentage}%
                </div>
              </div>
              <button
                onClick={() => handleDelete(cat)}
                className="btn btn-ghost btn-sm text-error"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
