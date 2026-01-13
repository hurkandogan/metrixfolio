import React from 'react';

interface StatCardsProps {
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  profitPercentage: number;
  goalPercentage: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalValue,
  totalInvested,
  totalProfit,
  profitPercentage,
  goalPercentage,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatPercentage = (val: number) => {
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  return (
    <div className="stats stats-vertical lg:stats-horizontal bg-base-100 w-full shadow lg:grid lg:grid-cols-4">
      {/* 1. Total Value (Elimizdeki Para) */}
      <div className="stat">
        <div className="stat-title font-semibold opacity-70">Total Balance</div>
        <div className="stat-value text-primary text-3xl font-extrabold tracking-tight lg:text-4xl">
          {formatCurrency(totalValue)}
        </div>
        <div className="stat-desc font-medium opacity-60">
          Current Portfolio Value
        </div>
      </div>

      {/* 2. Total Invested (Yatırılan Para - Transaction Toplamı) */}
      <div className="stat">
        <div className="stat-title font-semibold opacity-70">
          Invested Capital
        </div>
        <div className="stat-value text-3xl font-extrabold tracking-tight lg:text-4xl">
          {formatCurrency(totalInvested)}
        </div>
        <div className="stat-desc font-medium opacity-60">Net Deposits</div>
      </div>

      {/* 3. P&L (Kar/Zarar) */}
      <div className="stat">
        <div className="stat-title font-semibold opacity-70">Total P&L</div>
        <div
          className={`stat-value text-3xl font-extrabold tracking-tight lg:text-4xl ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}
        >
          {formatCurrency(totalProfit)}
        </div>
        <div
          className={`stat-desc text-sm font-bold ${profitPercentage >= 0 ? 'text-success' : 'text-error'}`}
        >
          {formatPercentage(profitPercentage)}
        </div>
      </div>

      {/* 4. Goal Progress (10k Hedefi) */}
      <div className="stat">
        <div className="stat-title font-semibold opacity-70">Goal ($10k)</div>
        <div className="stat-value text-secondary text-3xl font-extrabold tracking-tight lg:text-4xl">
          {goalPercentage.toFixed(1)}%
        </div>
        <div className="stat-desc mt-1">
          <progress
            className="progress progress-secondary w-full"
            value={goalPercentage}
            max="100"
          ></progress>
        </div>
      </div>
    </div>
  );
};
