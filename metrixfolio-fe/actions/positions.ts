'use server';

import { adminDb } from '@/utils/firebase-admin';
import { CollectionType } from '@/types/settings';
import { Asset } from '@/types/positions';

export async function getAssetsAction(userId: string): Promise<Asset[]> {
  if (!userId) return [];

  try {
    const assetsSnapshot = await adminDb
      .collection(CollectionType.USERS)
      .doc(userId)
      .collection(CollectionType.ASSETS)
      .get();

    const assets: Asset[] = assetsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        symbol: data.symbol || '',
        name: data.name || '',
        amount: parseFloat(data.amount) || 0,
        avg_cost: parseFloat(data.avg_cost) || 0,
        current_price: parseFloat(data.current_price) || 0,
        unrealized_pnl: parseFloat(data.unrealized_pnl) || 0,
        currency: data.currency || 'USD',
        source: data.source || 'MANUAL',
        category_id: data.category_id || 'uncategorized',
      };
    });

    return assets;
  } catch (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
}

export async function updateAssetCategoryAction(
  userId: string,
  assetId: string,
  categoryId: string,
) {
  if (!userId || !assetId || !categoryId) {
    return { success: false, message: 'Eksik parametreler.' };
  }

  try {
    // Yol: users/{userId}/assets/{assetId}
    const assetRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('assets') // Senin veriler burada
      .doc(assetId);

    await assetRef.update({
      category_id: categoryId,
    });

    return { success: true, message: 'Kategori güncellendi.' };
  } catch (error: any) {
    console.error('Update Category Error:', error);
    return { success: false, message: error.message };
  }
}
