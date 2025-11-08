'use client';

import useSWR from 'swr';
import { useAuth } from '@/context/AuthProvider';
import { PortfolioResponse } from '@/types/portfolio';
import { useEffect, useState } from 'react';

const fetcher = async ([url, token]: [
  string,
  string,
]): Promise<PortfolioResponse> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch portfolio data.');
  }
  return response.json();
};

export function usePortfolio() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdToken().then(setToken);
    }
  }, [user]);

  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/portfolio`;

  const { data, error, isLoading } = useSWR<PortfolioResponse>(
    token ? [apiUrl, token] : null,
    fetcher,
    {
      refreshInterval: 1000 * 60 * 15,
    },
  );

  return {
    portfolio: data,
    isLoading,
    isError: error,
  };
}
