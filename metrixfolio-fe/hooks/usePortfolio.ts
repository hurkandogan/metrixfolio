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

  // Token'ı taze taze al
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
    user ? [`http://localhost:8080/api/v1/portfolio/summary`, user.uid] : null,

    ([url]) => fetcherWithAuth(url),
  );

  return {
    portfolio: data,
    isLoading,
    isError: error,
    mutate,
  };
}
