'use client';

import { useMemo } from 'react';
import { StatCards } from '@/components/dashboard/StatCards';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { GoalTable } from '@/components/dashboard/GoalTable';
import { useAuth } from '@/context/AuthProvider';
import { usePortfolio } from '@/hooks/usePortfolio';
import { CategoryCards } from '@/components/dashboard/CategoryCards';

export default function Dashboard() {
  const { portfolio, isLoading, isError } = usePortfolio();

  console.log(portfolio);

  const targetChartData = useMemo(() => {
    if (!portfolio?.categories) return [];
    return Object.values(portfolio.categories).map((cat) => ({
      name: `${cat.name}`,
      value: cat.target_percentage,
    }));
  }, [portfolio]);

  const actualChartData = useMemo(() => {
    if (!portfolio?.categories) return [];
    return Object.values(portfolio.categories).map((cat) => ({
      name: `${cat.name}`,
      value: parseFloat(cat.actual_percentage.toFixed(2)),
    }));
  }, [portfolio]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="ml-4 text-lg">Metrixfolio data is loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="alert alert-error">
        <svg></svg>
        <span>Portfolio fetch error: {isError.message}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <StatCards
          totalValue={portfolio?.total_value || 0}
          currentTarget={portfolio?.total_cost || 0}
          totalProfit={portfolio?.total_pnl || 0}
          profitPercentage={portfolio?.pnl_percentage || 0}
        />

        {portfolio?.categories && (
          <CategoryCards categories={portfolio.categories} />
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AllocationChart title="Target Allocation" data={targetChartData} />
          <AllocationChart title="Actual Allocation" data={actualChartData} />
        </div>

        <div className="w-full">
          <div className="lg:col-span-2">
            <GoalTable currentValue={portfolio?.total_value || 0} />
          </div>
        </div>
      </div>
    </>
  );
}
