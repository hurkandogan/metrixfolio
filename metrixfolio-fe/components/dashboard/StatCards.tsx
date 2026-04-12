import React, { useState, useEffect } from 'react';
import { FiArrowUp, FiArrowDown, FiMinus } from 'react-icons/fi';
import { useDebts } from '@/hooks/useDebts';

interface StatCardsProps {
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  profitPercentage: number;
  prevTotalValue?: number;
  prevInvested?: number;
}

const GOAL_MILESTONES = [
  10000, 25000, 50000, 75000, 100000, 250000, 500000, 750000, 1000000,
];

export const StatCards: React.FC<StatCardsProps> = ({
  totalValue,
  totalInvested,
  totalProfit,
  profitPercentage,
  prevTotalValue,
  prevInvested,
}) => {
  const [goalAmount, setGoalAmount] = useState<number>(10000);
  const { totalDebtUsd } = useDebts();
  const netAmount = totalProfit - totalDebtUsd;
  const netPercentage = totalValue > 0 ? (netAmount / totalValue) * 100 : 0;

  useEffect(() => {
    const nextGoal =
      GOAL_MILESTONES.find((g) => g > totalValue) ||
      GOAL_MILESTONES[GOAL_MILESTONES.length - 1];
    setGoalAmount(nextGoal);
  }, [totalValue]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatPercentage = (val: number) => {
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const renderDiff = (current: number, prev: number | undefined) => {
    if (prev === undefined)
      return <span className="text-xs opacity-60">No history</span>;

    const diff = current - prev;
    if (Math.abs(diff) < 0.01)
      return (
        <span className="flex items-center gap-1 text-xs opacity-60">
          <FiMinus /> No Change
        </span>
      );

    const isPos = diff > 0;
    const color = isPos ? 'text-success' : 'text-error';
    const Icon = isPos ? FiArrowUp : FiArrowDown;

    return (
      <span className={`flex items-center gap-1 text-xs font-bold ${color}`}>
        <Icon /> {formatCurrency(Math.abs(diff))}
      </span>
    );
  };

  const safeGoal = goalAmount > 0 ? goalAmount : 1;
  const goalPercentage = Math.min((totalValue / safeGoal) * 100, 100);

  const progressColor =
    goalPercentage < 25
      ? 'progress-error'
      : goalPercentage < 55
        ? 'progress-warning'
        : goalPercentage < 80
          ? 'progress-info'
          : 'progress-success';

  return (
    <div className="stats stats-vertical lg:stats-horizontal bg-base-100 w-full shadow lg:grid lg:grid-cols-4">
      <div className="stat">
        <div className="stat-title font-semibold opacity-70">Total Balance</div>
        <div className="stat-value text-primary text-3xl font-extrabold tracking-tight lg:text-4xl">
          {formatCurrency(totalValue)}
        </div>
        <div className="stat-desc mt-1 font-medium">
          {renderDiff(totalValue, prevTotalValue)}
        </div>
      </div>

      <div className="stat flex flex-col gap-1">
        <div className="stat-title font-semibold opacity-70">
          Invested Capital
        </div>
        <div className="stat-value text-3xl font-extrabold tracking-tight lg:text-4xl">
          {formatCurrency(totalInvested)}
        </div>
      </div>

      <div className="stat">
        <div className="stat-title font-semibold opacity-70">Total P&L</div>
        <div
          className={`stat-value text-3xl font-extrabold tracking-tight lg:text-4xl ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}
        >
          {formatCurrency(totalProfit)}
        </div>
        <div className="stat-desc mt-1 flex flex-row items-center justify-between w-full">
          <span
            className={`text-sm font-bold flex-shrink-0 ${profitPercentage >= 0 ? 'text-success' : 'text-error'}`}
          >
            {formatPercentage(profitPercentage)}
          </span>
          <span className={`ml-auto flex items-center text-xs font-semibold whitespace-nowrap pl-2 ${netAmount >= 0 ? 'text-success' : 'text-error'}`}>
            Net: {formatPercentage(netPercentage)} | {formatCurrency(netAmount)}
          </span>
        </div>
      </div>

      <div className="stat">
        <div className="stat-title flex items-center justify-between font-semibold opacity-70">
          <span>Goal Target</span>
          <div className="flex items-center gap-1">
            <span className="text-xs opacity-50">$</span>
            <input
              type="number"
              className="input input-ghost input-xs focus:text-primary h-6 w-24 [appearance:textfield] pr-3 text-right font-bold focus:bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={goalAmount}
              onChange={(e) => setGoalAmount(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="stat-value text-secondary text-3xl font-extrabold tracking-tight lg:text-4xl">
          {goalPercentage.toFixed(1)}%
        </div>
        <div className="stat-desc mt-1">
          <progress
            className={`progress w-full ${progressColor}`}
            value={goalPercentage}
            max="100"
          ></progress>
        </div>
      </div>
    </div>
  );
};
