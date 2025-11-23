'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  QuerySnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { UserSettings, CollectionType } from '@/types/settings';

interface SettingsData {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
}

export function useSettingsData(): SettingsData {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    categories: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    setIsLoading(true);
    setError(null);

    const settingsRef = doc(
      db,
      CollectionType.USERS,
      user.uid,
      CollectionType.SETTINGS,
      CollectionType.CONFIG,
    );
    const unsubscribeSettings = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserSettings;
          setSettings({
            categories: data.categories || [],
          });
        } else {
          console.log('UserSettings document does not exist, using defaults.');
          setSettings({ categories: [] });
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Firestore (Settings) listening error: ', err);
        setError('Failed to load settings.');
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribeSettings();
    };
  }, [user]);

  return { settings, isLoading, error };
}
