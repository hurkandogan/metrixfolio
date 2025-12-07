'use server';

import { adminDb } from '@/utils/firebase-admin';
import { CollectionType } from '@/types/settings';
import { Asset } from '@/types/positions';

interface MarketData {
  symbol: string;
  price: number;
  currency: string;
  last_updated: number;
}

export async function getAssetsAction(userId: string): Promise<Asset[]> {
  if (!userId) return [];

  try {
    // 1. Assetleri Çek
    const assetsSnapshot = await adminDb
      .collection(CollectionType.USERS)
      .doc(userId)
      .collection('assets') // CollectionType.ASSETS
      .get();

    // 2. Market Data'yı Çek (Canlı Fiyatlar)
    // Not: Hepsini çekmek maliyetli olabilir ama şimdilik basit tutalım.
    // İleride 'whereIn' ile sadece portföydeki sembolleri çekebiliriz.
    const marketSnapshot = await adminDb.collection('market_data').get();

    // Market Data'yı Map'e çevir (Hızlı erişim için)
    // Key: Symbol (AAPL), Value: Price (175.50)
    const priceMap = new Map<string, number>();
    marketSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.symbol && data.price) {
        priceMap.set(data.symbol, Number(data.price));
      }
    });

    const assets: Asset[] = assetsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const symbol = data.symbol || '';

      // --- FİYAT GÜNCELLEME SİHRİ ---
      // Eğer Market Data'da güncel fiyat varsa onu kullan, yoksa eskisi kalsın.
      // Opsiyonları (boşluklu isimler) ve Manuel'leri pas geçebiliriz istersen.
      let currentPrice = parseFloat(data.current_price) || 0;

      if (priceMap.has(symbol)) {
        currentPrice = priceMap.get(symbol)!;
      }
      // ------------------------------

      return {
        id: doc.id,
        symbol: symbol,
        name: data.name || '',
        amount: parseFloat(data.amount) || 0,
        avg_cost: parseFloat(data.avg_cost) || 0,

        // Güncel fiyatı buraya koyuyoruz
        current_price: currentPrice,

        // PnL hesabı burada tekrar yapılmalı çünkü fiyat değişti!
        // PnL = (Current Price - Avg Cost) * Amount * Multiplier
        // Ama basitlik olsun diye şimdilik eski PnL kalsın veya frontend hesaplasın.
        unrealized_pnl: parseFloat(data.unrealized_pnl) || 0,

        currency: data.currency || 'USD',
        source: data.source || 'MANUAL',
        category_id: data.category_id || 'uncategorized',
        multiplier: parseFloat(data.multiplier) || 1,
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
    return { success: false, message: 'Missing parameters.' };
  }

  try {
    const assetRef = adminDb
      .collection(CollectionType.USERS)
      .doc(userId)
      .collection(CollectionType.ASSETS)
      .doc(assetId);

    await assetRef.update({
      category_id: categoryId,
    });

    return { success: true, message: 'Category updated.' };
  } catch (error: any) {
    console.error('Update Category Error:', error);
    return { success: false, message: error.message };
  }
}
