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

    // 2. Market Data'yı Çek (Sadece Kullanıcının Varlıkları İçin)
    const userSymbols = new Set<string>();
    assetsSnapshot.docs.forEach((doc) => {
      const s = doc.data().symbol;
      if (s) userSymbols.add(s);
    });
    const uniqueSymbols = Array.from(userSymbols);

    const priceMap = new Map<string, number>();

    if (uniqueSymbols.length > 0) {
      const chunkSize = 30; // Firestore 'in' query limiti
      const chunks = [];
      for (let i = 0; i < uniqueSymbols.length; i += chunkSize) {
        chunks.push(uniqueSymbols.slice(i, i + chunkSize));
      }

      const promises = chunks.map((chunk) =>
        adminDb.collection('market_data').where('symbol', 'in', chunk).get(),
      );
      const snapshots = await Promise.all(promises);

      snapshots.forEach((snap) => {
        snap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.symbol && data.price) {
            priceMap.set(data.symbol, Number(data.price));
          }
        });
      });
    }

    const assets: Asset[] = assetsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const symbol = data.symbol || '';
      const amount = parseFloat(data.amount) || 0;
      const avgCost = parseFloat(data.avg_cost) || 0;
      const multiplier = parseFloat(data.multiplier) || 1;

      // --- FİYAT GÜNCELLEME SİHRİ ---
      // Eğer Market Data'da güncel fiyat varsa onu kullan, yoksa eskisi kalsın.
      // Opsiyonları (boşluklu isimler) ve Manuel'leri pas geçebiliriz istersen.
      let currentPrice = parseFloat(data.current_price) || 0;

      if (priceMap.has(symbol)) {
        currentPrice = priceMap.get(symbol)!;
      }
      // ------------------------------

      // PnL Recalculation (Refactoring)
      // Veritabanındaki eski PnL yerine, güncel fiyatla anlık hesaplıyoruz.
      const calculatedUnrealizedPnl =
        (currentPrice - avgCost) * amount * multiplier;

      return {
        id: doc.id,
        symbol: symbol,
        name: data.name || '',
        amount: amount,
        avg_cost: avgCost,

        // Güncel fiyatı buraya koyuyoruz
        current_price: currentPrice,

        // Artık canlı hesaplanmış PnL dönüyoruz
        unrealized_pnl: calculatedUnrealizedPnl,

        currency: data.currency || 'USD',
        source: data.source || 'MANUAL',
        category_id: data.category_id || 'uncategorized',
        multiplier: multiplier,
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
