'use client';

import { useState, useTransition, useMemo } from 'react';
import { Category, CategoryType } from '@/types/settings';
import { Position } from '@/types/positions';
import { addCategoryAction, updateCategoryAction } from '../actions';
import {
  FiLoader,
  FiEdit2,
  FiSave,
  FiXCircle,
  FiTrash2,
  FiInfo,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';

interface CategoryManagerProps {
  user: any;
  categories: Category[];
  openPositions: Position[];
  showModal: (title: string, message: string, isError?: boolean) => void;
  onDeleteCategory: (item: Category) => void;
  onClosePosition: (item: Position) => void;
  isProcessing: boolean;
}

export function CategoryManager({
  user,
  categories,
  openPositions,
  showModal,
  onDeleteCategory,
  onClosePosition,
  isProcessing,
}: CategoryManagerProps) {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryTarget, setNewCategoryTarget] = useState<number>(0);
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('ASSET');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryTarget, setEditCategoryTarget] = useState<number | string>(
    '',
  );
  const [editCategoryType, setEditCategoryType] =
    useState<CategoryType>('ASSET');

  const [isAdding, startAddTransition] = useTransition();

  const totalTargetPercentage = useMemo(() => {
    return categories.reduce((sum, cat) => {
      return sum + (cat.target_percentage || 0);
    }, 0);
  }, [categories]);

  const handleAddCategory = async () => {
    if (!user) return showModal('Error', 'User not authenticated.', true);
    const targetAsNumber = parseFloat(String(newCategoryTarget));

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

    startAddTransition(async () => {
      const result = await addCategoryAction(
        user.uid,
        newCategoryName,
        totalTargetPercentage,
        newCategoryType,
      );
      if (result.success) {
        setNewCategoryName('');
        setNewCategoryTarget(0);
        showModal('Success', result.message, false);
      } else {
        showModal('Error', result.message, true);
      }
    });
  };

  const handleEditClick = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryTarget(category.target_percentage);
    setEditCategoryType(category.type);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategoryTarget('');
    setEditCategoryType('ASSET');
  };

  const handleSaveEdit = async (oldCategory: Category) => {
    if (!user) return showModal('Error', 'User not authenticated.', true);
    const targetAsNumber = parseFloat(String(editCategoryTarget));

    const newCategoryData = {
      name: editCategoryName,
      target_percentage: targetAsNumber,
      type: editCategoryType,
    };
    startAddTransition(async () => {
      const newCategoryData = {
        name: editCategoryName,
        target_percentage: targetAsNumber,
        type: editCategoryType,
      };
      const result = await updateCategoryAction(
        user.uid,
        oldCategory,
        newCategoryData,
      );
      if (result.success) {
        setEditingCategoryId(null);
        showModal('Success', result.message, false);
      } else {
        showModal('Error', result.message, true);
      }
    });
  };

  return (
    <div
      role="tabpanel"
      className="tab-content bg-base-100 border-base-300 rounded-box p-6"
    >
      <div className="mb-0">
        {totalTargetPercentage > 100 && (
          <div role="alert" className="alert alert-error">
            <FiAlertCircle />
            <span>
              Error: Total target is {totalTargetPercentage}%. This is over the
              100% limit.
            </span>
          </div>
        )}
        {totalTargetPercentage < 100 && totalTargetPercentage > 0 && (
          <div role="alert" className="alert alert-info">
            <FiInfo />
            <span>
              Notice: Total target is {totalTargetPercentage}%. You still have{' '}
              {100 - totalTargetPercentage}% left to assign.
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

      <h2 className="mb-4 text-2xl font-semibold">Category Management</h2>

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
            onChange={(e) => setNewCategoryTarget(parseInt(e.target.value))}
            step="any"
            min="0"
            max="100"
            disabled={isProcessing}
          />
        </div>
        <div className="form-control">
          <label className="label mb-4">
            <span className="label-text">Category Type:</span>
          </label>
          <select
            className="select select-bordered"
            value={newCategoryType}
            onChange={(e) => setNewCategoryType(e.target.value as CategoryType)}
            disabled={isProcessing}
          >
            <option value="ASSET">Asset (Stocks, Crypto)</option>
            <option value="CASH">Cash (USD, EUR, etc...)</option>
          </select>
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
        {categories.length === 0 && (
          <span className="text-base-content/50 italic">
            No categories added yet.
          </span>
        )}

        {categories.map((cat) => {
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
                      onChange={(e) => setEditCategoryName(e.target.value)}
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
                      onChange={(e) => setEditCategoryTarget(e.target.value)}
                      step="any"
                    />
                  </div>
                  <div className="form-control mt-2">
                    <label className="label">
                      <span className="label-text">Category Type</span>
                    </label>
                    <select
                      className="select select-sm"
                      value={editCategoryType}
                      onChange={(e) =>
                        setEditCategoryType(e.target.value as CategoryType)
                      }
                    >
                      <option value="ASSET">Asset (Stocks, Crypto)</option>
                      <option value="CASH">Cash (EUR, USD, etc...)</option>
                    </select>
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
                      )}
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
                      <span
                        className={`badge badge-sm ${cat.type === 'CASH' ? 'badge-info' : 'badge-secondary'}`}
                      >
                        {cat.type}
                      </span>
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
                        onClick={() => onDeleteCategory(cat)}
                        disabled={isProcessing}
                        title={`Delete ${cat.name}`}
                      >
                        <FiTrash2 className="text-error" />
                      </button>
                    </div>
                  </div>

                  <p className="text-base-content/50 -mt-2 mb-4 text-xs">
                    {openPositions.length} asset(s) in this category.
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
                        {openPositions.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="text-base-content/50 text-center italic"
                            >
                              No assets assigned.
                            </td>
                          </tr>
                        )}

                        {openPositions
                          .filter((position) => position.category_id === cat.id)
                          .map((position) => (
                            <tr
                              key={position.id}
                              className="hover:bg-base-300 cursor-pointer transition-colors"
                            >
                              <td className="font-bold">{position.ticker}</td>
                              <td className="text-right">{position.amount}</td>
                              <td className="text-right">
                                <button
                                  className="btn btn-ghost btn-square btn-xs"
                                  onClick={() => onClosePosition(position)}
                                  disabled={isProcessing}
                                  title={`Delete Asset ${position.ticker}`}
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
  );
}
