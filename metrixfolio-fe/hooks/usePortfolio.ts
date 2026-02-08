import useSWR from 'swr';
import { useAuth } from '@/context/AuthProvider';
import { getCategoriesAction } from '@/actions/categories';
import { getAssetsAction } from '@/actions/positions';
import { getTransactionsAction } from '@/actions/transactions';
import { getExchangeRatesAction } from '@/actions/currency';
import { getPortfolioHistoryAction } from '@/actions/history';
import { Category } from '@/types/settings';
import { Asset } from '@/types/positions';
import { Transaction } from '@/types/transaction';
import { PortfolioHistory } from '@/types/history';

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  pnl_percentage: number;
  unrealized_pnl: number;
  base_currency: string;
  categories: {
    id: string;
    name: string;
    value: number;
    actual_percentage: number;
    target_percentage: number;
    color?: string;
  }[];
}

export function usePortfolio() {
  const { user } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    user ? ['portfolio-data', user.uid] : null,
    async ([_, userId]) => {
      const [categories, assets, transactions, rates, history] = await Promise.all([
        getCategoriesAction(userId),
        getAssetsAction(userId),
        getTransactionsAction(userId),
        getExchangeRatesAction(),
        getPortfolioHistoryAction(userId),
      ]);

      const rateMap = new Map<string, number>();
      rates.forEach((r) => {
        rateMap.set(`${r.from}_${r.to}`, r.rate);
      });

      const convertToUsd = (amount: number, fromCurrency: string) => {
        if (!fromCurrency || fromCurrency === 'USD') return amount;
        const directKey = `${fromCurrency}_USD`;
        if (rateMap.has(directKey)) return amount * rateMap.get(directKey)!;
        const inverseKey = `USD_${fromCurrency}`;
        if (rateMap.has(inverseKey) && rateMap.get(inverseKey)! !== 0)
          return amount / rateMap.get(inverseKey)!;
        return amount;
      };

      let totalValue = 0;
      let totalUnrealizedPnl = 0;
      const categoryValues = new Map<string, number>();

      assets.forEach((asset) => {
        totalValue += asset.market_value || 0;
        totalUnrealizedPnl += asset.unrealized_pnl || 0;

        const catId = asset.category_id || 'uncategorized';
        categoryValues.set(
          catId,
          (categoryValues.get(catId) || 0) + (asset.market_value || 0),
        );
      });

      let totalInvested = 0;
      transactions.forEach((t) => {
        const amount = Number(t.amount) || 0;
        const valInUsd = convertToUsd(amount, t.currency || 'USD');

        if (t.type === 'DEPOSIT') {
          totalInvested += valInUsd;
        } else if (t.type === 'WITHDRAWAL') {
          totalInvested -= valInUsd;
        }
      });

      const totalPnl = totalValue - totalInvested;
      const pnlPercentage =
        totalInvested !== 0 ? (totalPnl / totalInvested) * 100 : 0;

      const categoryAnalysis = categories.map((cat) => {
        const val = categoryValues.get(cat.id) || 0;
        const actualPct = totalValue !== 0 ? (val / totalValue) * 100 : 0;
        return {
          id: cat.id,
          name: cat.name,
          value: val,
          actual_percentage: actualPct,
          target_percentage: cat.target_percentage,
          color: cat.color,
        };
      });

      console.log(categories)

      const summary: PortfolioSummary = {
        total_value: totalValue,
        total_cost: totalInvested,
        total_pnl: totalPnl,
        pnl_percentage: pnlPercentage,
        unrealized_pnl: totalUnrealizedPnl,
        base_currency: 'USD',
        categories: categoryAnalysis,
      };

      return { categories, assets, transactions, summary, history };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 300000,
      keepPreviousData: true,
    },
  );

  return {
    portfolio: data?.summary,
    assets: data?.assets || ([] as Asset[]),
    categories: data?.categories || ([] as Category[]),
    transactions: data?.transactions || ([] as Transaction[]),
    history: data?.history || ([] as PortfolioHistory[]),
    isLoading,
    isError: error,
    mutate,
  };
}
