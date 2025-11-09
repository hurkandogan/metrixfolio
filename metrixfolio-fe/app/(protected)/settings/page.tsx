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
  addPositionAction,
  closePositionAction,
} from './actions';
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';
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
  CategoryType,
  CollectionType,
} from '@/types/settings';
import { Position } from '@/types/positions';
import { CategoryManager } from './components/CategoryManager';
import { useSettingsData } from '@/hooks/useSettingsData';
import { PositionManager } from './components/PositionManager';
//import { ConnectionManager } from './components/ConnectionManager';

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, openPositions, isLoading, error } = useSettingsData();

  const [isProcessing, startTransition] = useTransition();
  const [modalRef, setModalRef] = useState<HTMLDialogElement | null>(null); //TODO: useRef?
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    isError: false,
  });
  const [itemToDelete, setItemToDelete] = useState<Category | null>(null);
  const [itemToClose, setItemToClose] = useState<Position | null>(null);
  const [exitPrice, setExitPrice] = useState<number | string>('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const showModal = (
    title: string,
    message: string,
    isError: boolean = false,
  ) => {
    setModalContent({ title, message, isError });
    modalRef?.showModal();
  };
  const totalTargetPercentage = useMemo(() => {
    return settings.categories.reduce((sum, cat) => {
      return sum + (cat.target_percentage || 0);
    }, 0);
  }, [settings.categories]);

  const handleDeleteCategoryClick = (category: Category) => {
    if (!user) return showModal('Error', 'User not authenticated.', true);
    setItemToDelete(category); // Sadece state'i ayarla
    showModal(
      'Confirm Deletion',
      `Are you sure you want to delete "${category.name}"?`,
      true,
    );
  };

  const handleConfirmDeleteCategory = async () => {
    if (!user || !itemToDelete) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(user.uid, itemToDelete);
      if (result.success) {
        modalRef?.close();
      } else {
        showModal('Error', result.message, true);
      }
      setItemToDelete(null);
    });
  };

  const handleClosePositionClick = (position: Position) => {
    if (!user) return showModal('Error', 'User not authenticated.', true);
    setItemToClose(position);
    setExitPrice('');
    showModal(
      `Close Position: ${position.ticker || position.currency}`,
      'Please enter the exit price (per unit) and date.',
      false,
    );
  };

  const handleConfirmClosePosition = async () => {
    if (!user || !itemToClose) return;
    const priceAsNumber = parseFloat(String(exitPrice));
    if (priceAsNumber <= 0) {
      return showModal(
        'Input Error',
        'Exit price must be greater than 0.',
        true,
      );
    }

    startTransition(async () => {
      const result = await closePositionAction(
        user.uid,
        itemToClose,
        priceAsNumber,
        Date.now(),
      );
      if (result.success) {
        modalRef?.close();
      } else {
        showModal('Error', result.message, true);
      }
      setItemToClose(null);
    });
  };

  const onModalClose = () => {
    setItemToDelete(null);
    setItemToClose(null);
    setExitPrice('');
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

  if (error) {
    return (
      <div role="alert" className="alert alert-error">
        <FiAlertCircle />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <>
      <dialog
        ref={(ref) => setModalRef(ref)}
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box">
          <h3
            className={`text-lg font-bold ${modalContent.isError ? 'text-error' : 'text-success'}`}
          >
            {modalContent.title}
          </h3>
          <p className="py-4">{modalContent.message}</p>

          {itemToClose && (
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Exit Price (per unit)</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 150.50"
                className="input input-bordered"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                step="any"
              />
            </div>
          )}

          <div className="modal-action">
            {itemToDelete && (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={onModalClose}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  className={`btn btn-error ${isProcessing ? 'btn-disabled' : ''}`}
                  onClick={handleConfirmDeleteCategory}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <FiLoader className="loading loading-spinner" />
                  ) : (
                    'Yes, Delete'
                  )}
                </button>
              </>
            )}

            {itemToClose && (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={onModalClose}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  className={`btn btn-primary ${isProcessing ? 'btn-disabled' : ''}`}
                  onClick={handleConfirmClosePosition}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <FiLoader className="loading loading-spinner" />
                  ) : (
                    'Confirm Close Position'
                  )}
                </button>
              </>
            )}

            {!itemToDelete && !itemToClose && (
              <form method="dialog">
                <button className="btn" onClick={onModalClose}>
                  Close
                </button>
              </form>
            )}
          </div>
        </div>
        <form
          method="dialog"
          className="modal-backdrop"
          onSubmit={onModalClose}
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
            {/* <APIConnections /> */}
          </div>

          <input
            type="radio"
            name="settings_tabs"
            role="tab"
            className="tab"
            aria-label="Positions"
            defaultChecked
          />
          <PositionManager
            user={user}
            settings={settings}
            openPositions={openPositions}
            showModal={showModal}
            onClosePosition={handleClosePositionClick}
            isProcessing={false}
          />

          <input
            type="radio"
            name="settings_tabs"
            role="tab"
            className="tab"
            aria-label="Categories"
            defaultChecked
          />

          <CategoryManager
            user={user}
            categories={settings.categories}
            openPositions={openPositions}
            showModal={showModal}
            onDeleteCategory={handleDeleteCategoryClick}
            onClosePosition={handleClosePositionClick}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </>
  );
}
