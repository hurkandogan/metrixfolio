'use client';

import { useEffect, useState } from 'react';
import { StatCards } from '@/components/dashboard/StatCards';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { GoalTable } from '@/components/dashboard/GoalTable';
import { PortfolioData } from '@/types/Data';
import { useAuth } from '@/context/AuthProvider';

const targetData = [
  { name: 'Growth', value: 60 },
  { name: 'Cash', value: 15 },
  { name: 'High Risk', value: 10 },
  { name: 'Options', value: 10 },
  { name: 'Metal', value: 5 },
];

const actualData = [
  { name: 'Growth', value: 34.53 },
  { name: 'Cash', value: 8.89 },
  { name: 'High Risk', value: 45.92 },
  { name: 'Options', value: 11.07 },
  { name: 'Metal', value: 0 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(
    null,
  );
  const [krakenData, setKrakenData] = useState<any>(null);
  const [stocksData, setStocksData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioData();
  }, [user]);

  const fetchPortfolioData = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    let token: string;
    try {
      token = await user.getIdToken();
    } catch (authError) {
      console.error('Error getting ID token:', authError);
      setIsLoading(false);
      return;
    }

    try {
      const krakenRes = await fetch(
        //`${process.env.NEXT_PUBLIC_API_BASE_URL}/kraken/portfolio`,
        `http://localhost:8080/kraken/portfolio`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!krakenRes.ok) {
        throw new Error(`Kraken API error: ${krakenRes.statusText}`);
      }
      const krakenJson: PortfolioData = await krakenRes.json();
      setPortfolioData(krakenJson);
      setIsLoading(false);
    } catch (krakenError) {
      console.error('Error fetching Kraken data:', krakenError);
      setError('Failed to fetch Kraken portfolio data.');
      setIsLoading(false);
      return;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="ml-4 text-lg">Metrixfolio data is loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="alert alert-error">
        <svg></svg>
        <span>Hata: {error}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <StatCards
          totalValue={portfolioData?.total_eur_value || 0}
          currentTarget={220.0}
          totalProfit={1536.72}
          profitPercentage={87.32}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GoalTable
              startingAmount={200}
              steps={50}
              currentValue={201}
              growthRate={0}
            />
          </div>

          <div className="flex flex-col gap-6">
            <AllocationChart title="Target" data={targetData} />
            <AllocationChart title="Actual" data={actualData} />
          </div>
        </div>
      </div>
    </>
  );
}
