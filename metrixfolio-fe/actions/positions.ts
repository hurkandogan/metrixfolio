'use server';

import { adminDb } from '@/utils/firebase-admin';
import { CollectionType } from '@/types/settings';
import { Asset } from '@/types/positions';
import { getExchangeRatesAction } from '@/actions/currency';

interface MarketData {
  symbol: string;
  price: number;
  currency: string;
  last_updated: number;
}

export async function getAssetsAction(userId: string): Promise<Asset[]> {
  if (!userId) return [];

  try {
    const [assetsSnapshot, rates] = await Promise.all([
      adminDb
        .collection(CollectionType.USERS)
        .doc(userId)
        .collection('assets')
        .get(),
      getExchangeRatesAction(),
    ]);

    const rateMap = new Map<string, number>();
    rates.forEach((r) => {
      rateMap.set(`${r.from}_${r.to}`, r.rate);
    });

    const convertToUsd = (amount: number, fromCurrency: string) => {
      if (fromCurrency === 'USD') return amount;
      const directKey = `${fromCurrency}_USD`;
      if (rateMap.has(directKey)) return amount * rateMap.get(directKey)!;
      const inverseKey = `USD_${fromCurrency}`;
      if (rateMap.has(inverseKey) && rateMap.get(inverseKey)! !== 0)
        return amount / rateMap.get(inverseKey)!;
      return amount;
    };

    const assets: Asset[] = assetsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const symbol = data.symbol || '';
      const amount = parseFloat(data.amount) || 0;
      const multiplier = parseFloat(data.multiplier) || 1;
      const currency = data.currency || 'USD';
      const type = data.type || 'STOCK';

      let avgCost = parseFloat(data.avg_cost) || 0;

      // IBKR Opsiyonlarında avg_cost toplam maliyet olarak gelir. UI'da fiyatla yan yana
      // mantıklı görünmesi için (örn: $169 yerine $1.69) çarpana bölüyoruz.
      if (data.source === 'IBKR' && type === 'OPTION' && multiplier > 1) {
        avgCost = avgCost / multiplier;
      }

      const currentPrice = parseFloat(data.current_price) || 0;
      let unrealizedPnl = parseFloat(data.unrealized_pnl) || 0;

      // Manuel varlıkların PnL'si DB'de güncel olmayabilir, anlık hesaplıyoruz.
      if (data.source !== 'IBKR') {
        unrealizedPnl = (currentPrice - avgCost) * amount * multiplier;
      }

      const marketValue = amount * currentPrice * multiplier;

      return {
        id: doc.id,
        symbol: symbol,
        name: data.name || '',
        amount: amount,
        avg_cost: convertToUsd(avgCost, currency),
        current_price: convertToUsd(currentPrice, currency),
        market_value: convertToUsd(marketValue, currency),
        unrealized_pnl: convertToUsd(unrealizedPnl, currency),
        currency: 'USD',
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

export async function deleteAssetAction(userId: string, assetId: string) {
  if (!userId || !assetId) {
    return { success: false, message: 'Missing parameters.' };
  }

  try {
    await adminDb
      .collection(CollectionType.USERS)
      .doc(userId)
      .collection(CollectionType.ASSETS)
      .doc(assetId)
      .delete();

    return { success: true, message: 'Asset deleted successfully.' };
  } catch (error: any) {
    console.error('Delete Asset Error:', error);
    return { success: false, message: error.message };
  }
}
