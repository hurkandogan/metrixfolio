import useSWR from 'swr';
import { useAuth } from '@/context/AuthProvider';
import { getDebtsAction } from '@/actions/debts';
import { getExchangeRatesAction } from '@/actions/currency';
import { Debt } from '@/types/debt';

export function useDebts() {
  const { user } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    user ? ['debts-data', user.uid] : null,
    async ([_, userId]) => {
      const [debts, rates] = await Promise.all([
        getDebtsAction(userId),
        getExchangeRatesAction(),
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

      let totalDebtUsd = 0;

      debts.forEach((debt) => {
        const debtValueUsd = convertToUsd(debt.amount, debt.currency);
        totalDebtUsd += debtValueUsd;
      });

      return { debts, totalDebtUsd };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    debts: data?.debts || ([] as Debt[]),
    totalDebtUsd: data?.totalDebtUsd || 0,
    isLoading,
    isError: error,
    mutate,
  };
}
