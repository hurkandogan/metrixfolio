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
import { useSettingsData } from '@/hooks/useSettingsData';
import CategoryManager from './components/CategoryManager';
//import { ConnectionManager } from './components/ConnectionManager';

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, isLoading, error } = useSettingsData();

  const [isProcessing, startTransition] = useTransition();
  const [modalRef, setModalRef] = useState<HTMLDialogElement | null>(null); //TODO: useRef?
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    isError: false,
  });
  const [itemToDelete, setItemToDelete] = useState<Category | null>(null);
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

  const onModalClose = () => {
    setItemToDelete(null);
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
                  //onClick={handleConfirmDeleteCategory}
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
            aria-label="Categories"
            defaultChecked
          />
          <div
            role="tabpanel"
            className="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            <CategoryManager />
          </div>
        </div>
      </div>
    </>
  );
}
