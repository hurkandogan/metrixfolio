import React, { useState, useEffect } from 'react';
import { FiArrowUp, FiArrowDown, FiMinus } from 'react-icons/fi';

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
    if (prev === undefined) return <span className="opacity-60 text-xs">No history</span>;
    
    const diff = current - prev;
    if (Math.abs(diff) < 0.01) return <span className="opacity-60 text-xs flex items-center gap-1"><FiMinus /> No Change</span>;

    const isPos = diff > 0;
    const color = isPos ? 'text-success' : 'text-error';
    const Icon = isPos ? FiArrowUp : FiArrowDown;
    
    return (
      <span className={`text-xs font-bold flex items-center gap-1 ${color}`}>
        <Icon /> {formatCurrency(Math.abs(diff))}
      </span>
    );
  };

  const diffValue = prevTotalValue !== undefined ? totalValue - prevTotalValue : 0;
  const diffInvested = prevInvested !== undefined ? totalInvested - prevInvested : 0;
  const dailyPnl = diffValue - diffInvested;

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
        <div className="stat-desc font-medium mt-1">
          {renderDiff(totalValue, prevTotalValue)}
        </div>
      </div>

      <div className="stat">
        <div className="stat-title font-semibold opacity-70">
          Invested Capital
        </div>
        <div className="stat-value text-3xl font-extrabold tracking-tight lg:text-4xl">
          {formatCurrency(totalInvested)}
        </div>
        <div className="stat-desc font-medium mt-1">
          {renderDiff(totalInvested, prevInvested)}
        </div>
      </div>

      <div className="stat">
        <div className="stat-title font-semibold opacity-70">Total P&L</div>
        <div
          className={`stat-value text-3xl font-extrabold tracking-tight lg:text-4xl ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}
        >
          {formatCurrency(totalProfit)}
        </div>
        <div className="stat-desc flex flex-col gap-0.5 mt-1">
          <span className={`text-sm font-bold ${profitPercentage >= 0 ? 'text-success' : 'text-error'}`}>
            {formatPercentage(profitPercentage)} (All time)
          </span>
          {prevTotalValue !== undefined && (
             <span className={`text-xs flex items-center gap-1 ${dailyPnl >= 0 ? 'text-success' : 'text-error'} opacity-70`}>
                {dailyPnl >= 0 ? <FiArrowUp/> : <FiArrowDown/>} {formatCurrency(Math.abs(dailyPnl))} (Today)
             </span>
           )}
        </div>
      </div>

      <div className="stat">
        <div className="stat-title font-semibold opacity-70 flex justify-between items-center">
          <span>Goal Target</span>
          <div className="flex items-center gap-1">
             <span className="text-xs opacity-50">$</span>
             <input 
               type="number" 
               className="input input-ghost input-xs w-24 text-right pr-3 h-6 focus:bg-transparent focus:text-primary font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
