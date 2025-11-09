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
import { Position } from '@/types/positions';
import {
  positionConverter,
  settingsConverter,
} from '@/utils/firestore-converter';

interface SettingsData {
  settings: UserSettings;
  openPositions: Position[];
  isLoading: boolean;
  error: string | null;
}

export function useSettingsData(): SettingsData {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    categories: [],
    connections: [],
  });
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
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
    ).withConverter(settingsConverter);
    const unsubscribeSettings = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserSettings;
          setSettings({
            categories: data.categories || [],
            connections: data.connections || [],
          });
        } else {
          console.log('UserSettings document does not exist, using defaults.');
          setSettings({ categories: [], connections: [] });
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Firestore (Settings) listening error: ', err);
        setError('Failed to load settings.');
        setIsLoading(false);
      },
    );

    const positionsRef = collection(
      db,
      CollectionType.USERS,
      user.uid,
      CollectionType.OPEN_POSITIONS,
    ).withConverter(positionConverter);

    const unsubscribePositions = onSnapshot(
      positionsRef,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const positions: Position[] = [];
        querySnapshot.forEach((doc) => {
          positions.push(doc.data() as Position);
        });
        setOpenPositions(positions);
        setIsLoading(false);
      },
      (err) => {
        console.error('Firestore (Positions) listening error:', err);
        setError('Failed to load positions.');
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribeSettings();
      unsubscribePositions();
    };
  }, [user]);

  return { settings, openPositions, isLoading, error };
}
