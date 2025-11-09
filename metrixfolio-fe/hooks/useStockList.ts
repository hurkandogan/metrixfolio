'use client';

import useSWR from 'swr';
import { StockInfo } from '@/types/positions';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStockList() {
  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/public/stock-list`;

  const { data, error, isLoading } = useSWR<StockInfo[]>(apiUrl, fetcher);

  return {
    stockList: data || [],
    isLoading: isLoading,
    isError: error,
  };
}
