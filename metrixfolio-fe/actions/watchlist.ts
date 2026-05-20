'use server';

import { adminDb } from '@/utils/firebase-admin';
import { WatchlistItem, WatchlistComment } from '@/types/watchlist';
import { FieldValue } from 'firebase-admin/firestore';

const WATCHLIST_COLLECTION = 'watchlist';

export async function getWatchlistAction(): Promise<WatchlistItem[]> {
  const snapshot = await adminDb.collection(WATCHLIST_COLLECTION).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      symbol: data.symbol || doc.id,
      name: data.name || '',
      exchange: data.exchange || '',
      category: data.category || '',
      industry: data.industry || '',
      currency: data.currency || 'USD',
      added_at: data.added_at?.toDate?.()?.toISOString?.() || '',
    };
  });
}

export async function addWatchlistItemAction(
  userId: string,
  symbol: string,
): Promise<{ success: boolean; message?: string }> {
  if (!userId || !symbol) return { success: false, message: 'Missing data' };

  const upperSymbol = symbol.toUpperCase().trim();
  if (!upperSymbol) return { success: false, message: 'Invalid symbol' };

  const docRef = adminDb.collection(WATCHLIST_COLLECTION).doc(upperSymbol);
  const existing = await docRef.get();

  if (existing.exists) {
    return { success: false, message: `${upperSymbol} is already in the watchlist` };
  }

  await docRef.set({
    symbol: upperSymbol,
    name: '',
    exchange: '',
    category: '',
    industry: '',
    currency: 'USD',
    added_at: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

export async function removeWatchlistItemAction(
  userId: string,
  symbol: string,
): Promise<{ success: boolean; message?: string }> {
  if (!userId || !symbol) return { success: false, message: 'Missing data' };

  await adminDb.collection(WATCHLIST_COLLECTION).doc(symbol).delete();
  return { success: true };
}

// --- Comments ---

export async function getCommentsAction(
  symbol: string,
): Promise<WatchlistComment[]> {
  if (!symbol) return [];

  const snapshot = await adminDb
    .collection(WATCHLIST_COLLECTION)
    .doc(symbol)
    .collection('comments')
    .orderBy('created_at', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      text: data.text || '',
      author_id: data.author_id || '',
      author_name: data.author_name || '',
      created_at: data.created_at?.toDate?.()?.toISOString?.() || '',
      updated_at: data.updated_at?.toDate?.()?.toISOString?.() || undefined,
    };
  });
}

export async function addCommentAction(
  userId: string,
  symbol: string,
  text: string,
): Promise<{ success: boolean; message?: string }> {
  if (!userId || !symbol || !text.trim()) {
    return { success: false, message: 'Missing data' };
  }

  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const authorName = userData
    ? `${userData.name || ''} ${userData.lastname || ''}`.trim() || 'Anonymous'
    : 'Anonymous';

  await adminDb
    .collection(WATCHLIST_COLLECTION)
    .doc(symbol)
    .collection('comments')
    .add({
      text: text.trim(),
      author_id: userId,
      author_name: authorName,
      created_at: FieldValue.serverTimestamp(),
    });

  return { success: true };
}

export async function updateCommentAction(
  userId: string,
  symbol: string,
  commentId: string,
  text: string,
): Promise<{ success: boolean; message?: string }> {
  if (!userId || !symbol || !commentId || !text.trim()) {
    return { success: false, message: 'Missing data' };
  }

  const commentRef = adminDb
    .collection(WATCHLIST_COLLECTION)
    .doc(symbol)
    .collection('comments')
    .doc(commentId);

  const commentDoc = await commentRef.get();
  if (!commentDoc.exists) return { success: false, message: 'Comment not found' };
  if (commentDoc.data()?.author_id !== userId) {
    return { success: false, message: 'Not authorized' };
  }

  await commentRef.update({
    text: text.trim(),
    updated_at: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

export async function deleteCommentAction(
  userId: string,
  symbol: string,
  commentId: string,
): Promise<{ success: boolean; message?: string }> {
  if (!userId || !symbol || !commentId) {
    return { success: false, message: 'Missing data' };
  }

  const commentRef = adminDb
    .collection(WATCHLIST_COLLECTION)
    .doc(symbol)
    .collection('comments')
    .doc(commentId);

  const commentDoc = await commentRef.get();
  if (!commentDoc.exists) return { success: false, message: 'Comment not found' };
  if (commentDoc.data()?.author_id !== userId) {
    return { success: false, message: 'Not authorized' };
  }

  await commentRef.delete();
  return { success: true };
}
