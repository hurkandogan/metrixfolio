'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import {
  addCategoryAction,
  getCategoriesAction,
  deleteCategoryAction,
  updateCategoryAction, // <--- YENİ IMPORT
} from '@/actions/categories';
import { Category } from '@/types/settings';
import { FiTrash2, FiPlus, FiLoader, FiEdit2, FiX } from 'react-icons/fi'; // FiEdit2 ve FiX eklendi
import useSWR from 'swr';

export default function CategoryManager() {
  const { user } = useAuth();

  // Form State
  const [name, setName] = useState('');
  const [target, setTarget] = useState(0);
  const [type, setType] = useState('ASSET');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null); // Düzenlenen kategori

  // Veri Çekme
  const {
    data: categories = [],
    error,
    isLoading,
    mutate,
  } = useSWR(user ? ['categories', user.uid] : null, ([, uid]) =>
    getCategoriesAction(uid),
  );

  const handleEditClick = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setTarget(cat.target_percentage);
    setType(cat.type as string);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setName('');
    setTarget(0);
    setType('ASSET');
  };

  const handleSubmit = async () => {
    if (!user || !name) return;
    setIsSubmitting(true);

    let res;

    if (editingCategory) {
      res = await updateCategoryAction(user.uid, {
        id: editingCategory.id,
        name,
        target_percentage: target,
        type: type as any,
      });
    } else {
      res = await addCategoryAction(user.uid, name, target, type);
    }

    if (res.success) {
      handleCancelEdit();
      mutate();
    } else {
      alert('Hata: ' + res.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (cat: Category) => {
    if (!user || !confirm(`Delete "${cat.name}"?`)) return;
    const res = await deleteCategoryAction(user.uid, cat);
    if (res.success) mutate();
    else alert('Hata: ' + res.message);
  };

  if (isLoading) return <div className="skeleton h-32 w-full"></div>;

  return (
    <div className="space-y-6">
      <div
        className={`flex flex-wrap items-end gap-4 rounded-lg border-2 p-4 transition-colors ${
          editingCategory
            ? 'bg-warning/10 border-warning'
            : 'bg-base-200 border-transparent'
        }`}
      >
        {editingCategory && (
          <div className="text-warning mb-2 flex w-full items-center gap-2 text-sm font-bold">
            <FiEdit2 /> Editing: {editingCategory.name}
          </div>
        )}

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

        <div className="flex gap-2">
          {/* İPTAL BUTONU (Sadece Edit Modunda) */}
          {editingCategory && (
            <button
              className="btn btn-ghost text-error"
              onClick={handleCancelEdit}
            >
              <FiX /> Cancel
            </button>
          )}

          {/* KAYDET BUTONU */}
          <button
            className={`btn ${editingCategory ? 'btn-warning' : 'btn-primary'}`}
            onClick={handleSubmit}
            disabled={isSubmitting || !name}
          >
            {isSubmitting ? (
              <FiLoader className="animate-spin" />
            ) : editingCategory ? (
              'Update'
            ) : (
              <FiPlus />
            )}
            {editingCategory ? '' : 'Add'}
          </button>
        </div>
      </div>

      {/* --- LİSTE --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`card bg-base-100 border shadow-sm transition-all hover:shadow-md ${
              editingCategory?.id === cat.id
                ? 'ring-warning ring-2'
                : 'border-base-300'
            }`}
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

              <div className="flex gap-1">
                {/* EDIT BUTTON */}
                <button
                  onClick={() => handleEditClick(cat)}
                  className="btn btn-ghost btn-sm text-warning"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>

                {/* DELETE BUTTON */}
                <button
                  onClick={() => handleDelete(cat)}
                  className="btn btn-ghost btn-sm text-error"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
