import useSWR from 'swr';
import { useAuth } from '@/context/AuthProvider';
import { auth } from '@/utils/firebase';

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  pnl_percentage: number;
  base_currency: string;
  categories: {
    id: string;
    name: string;
    value: number;
    actual_percentage: number;
    target_percentage: number;
  }[];
}

const fetcherWithAuth = async (url: string) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  const token = await currentUser.getIdToken();

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to fetch portfolio');
  }

  return res.json();
};

export function usePortfolio() {
  const { user } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<PortfolioSummary>(
    user
      ? [
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/portfolio/summary`,
          user.uid,
        ]
      : null,

    ([url]) => fetcherWithAuth(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 300000,
      keepPreviousData: true,
    },
  );

  return {
    portfolio: data,
    isLoading,
    isError: error,
    mutate,
  };
}
