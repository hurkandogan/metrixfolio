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

    const userSymbols = new Set<string>();
    assetsSnapshot.docs.forEach((doc) => {
      const s = doc.data().symbol;
      if (s) userSymbols.add(s);
    });
    const uniqueSymbols = Array.from(userSymbols);

    const priceMap = new Map<string, number>();

    if (uniqueSymbols.length > 0) {
      const chunkSize = 30;
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
      const currency = data.currency || 'USD';

      let currentPrice = parseFloat(data.current_price) || 0;

      if (priceMap.has(symbol)) {
        currentPrice = priceMap.get(symbol)!;
      }

      const marketValue = amount * currentPrice * multiplier;
      // TODO this is not working with options
      const calculatedUnrealizedPnl =
        (currentPrice - avgCost) * amount * multiplier;

      return {
        id: doc.id,
        symbol: symbol,
        name: data.name || '',
        amount: amount,
        avg_cost: convertToUsd(avgCost, currency),
        current_price: convertToUsd(currentPrice, currency),
        market_value: convertToUsd(marketValue, currency),
        unrealized_pnl: convertToUsd(calculatedUnrealizedPnl, currency),
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
