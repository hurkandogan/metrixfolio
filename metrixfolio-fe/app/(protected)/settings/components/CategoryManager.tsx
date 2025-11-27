'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import {
  addCategoryAction,
  getCategoriesAction,
  deleteCategoryAction,
} from '@/actions/categories';
import { Category } from '@/types/settings';
import { FiTrash2, FiPlus, FiLoader } from 'react-icons/fi';
import useSWR from 'swr';

export default function CategoryManager() {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [target, setTarget] = useState(0);
  const [type, setType] = useState('ASSET');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: categories = [],
    error,
    isLoading,
    mutate,
  } = useSWR(user ? ['categories', user.uid] : null, ([, uid]) =>
    getCategoriesAction(uid),
  );

  const handleAdd = async () => {
    if (!user || !name) return;
    setIsSubmitting(true);

    const res = await addCategoryAction(user.uid, name, target, type);

    if (res.success) {
      setName('');
      setTarget(0);
      mutate();
    } else {
      alert('Hata: ' + res.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (cat: Category) => {
    if (!user || !confirm(`Delete "${cat.name}"?`)) return;

    const res = await deleteCategoryAction(user.uid, cat);
    if (res.success) {
      mutate();
    } else {
      alert('Hata: ' + res.message);
    }
  };

  if (isLoading) return <div className="skeleton h-32 w-full"></div>;
  if (error)
    return <div className="alert alert-error">Failed to load categories</div>;

  return (
    <div className="space-y-6">
      <div className="bg-base-200 flex flex-wrap items-end gap-4 rounded-lg p-4">
        <div className="form-control min-w-[200px] flex-1">
          <label className="label">
            <span className="label-text">Category Name</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered w-full"
            placeholder="e.g. Growth Stocks"
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
            className="input input-bordered w-full"
          />
        </div>

        <div className="form-control w-40">
          <label className="label">
            <span className="label-text">Type</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="select select-bordered w-full"
          >
            <option value="ASSET">Asset</option>
            <option value="CRYPTO">Crypto</option>
            <option value="CASH">Cash</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={isSubmitting || !name}
        >
          {isSubmitting ? <FiLoader className="animate-spin" /> : <FiPlus />}
          Add
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.length === 0 && (
          <div className="col-span-full py-10 text-center opacity-50">
            No categories found.
          </div>
        )}

        {categories.map((cat) => (
          <div
            key={cat.id}
            className="card bg-base-100 border-base-300 border shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="card-body flex-row items-center justify-between p-4">
              <div>
                <h3 className="font-bold">{cat.name}</h3>
                <div className="mt-1 flex gap-2 text-xs opacity-70">
                  <span className="badge badge-sm badge-ghost">{cat.type}</span>
                  <span className="badge badge-sm badge-neutral">
                    {cat.target_percentage}% Target
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(cat)}
                className="btn btn-ghost btn-sm text-error"
                aria-label="Delete category"
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
