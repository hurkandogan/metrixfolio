'use client';

import { FC, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/utils/functions';
import {
  FiArrowUp,
  FiArrowDown,
  FiCheck,
  FiAlertTriangle,
  FiActivity,
  FiPieChart,
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { PortfolioHistory } from '@/types/history';

interface CategoryData {
  id: string;
  name: string;
  value: number;
  actual_percentage: number;
  target_percentage: number;
  color?: string;
}

interface CategoryCardsProps {
  categories: CategoryData[];
  history: PortfolioHistory[];
}

export const CategoryCards: FC<CategoryCardsProps> = ({ categories, history }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const modalRef = useRef<HTMLDialogElement>(null);

  const handleCardClick = (cat: CategoryData) => {
    setSelectedCategory(cat);
    modalRef.current?.showModal();
  };

  const chartData = useMemo(() => {
    if (!selectedCategory || !history || history.length === 0) return [];

    return history
      .map((day) => {
        const alloc = day.allocation.find(
          (a) => a.category_id === selectedCategory.id,
        );
        return {
          date: new Date(day.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          value: alloc ? alloc.value : 0,
          fullDate: day.date,
        };
      })
      .filter((d) => d.value > 0);
  }, [selectedCategory, history]);

  const sortedCategories = [...categories].sort((a, b) => {
    if (a.id === 'uncategorized') return -1;
    if (b.id === 'uncategorized') return 1;
    return b.value - a.value;
  });

  return (
    <>
      <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box w-11/12 max-w-3xl">
          {selectedCategory && (
            <>
              <h3
                className="text-lg font-bold"
                style={{ color: selectedCategory.color }}
              >
                {selectedCategory.name} Analysis
              </h3>
              
              <div className="mt-4 h-75 w-full">
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        minTickGap={30}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(val) => `$${val}`}
                        width={60}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Value']}
                        labelStyle={{ color: 'black' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={selectedCategory.color || '#3ABFF8'}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center opacity-50">
                    <FiPieChart className="mb-2 text-4xl" />
                    <p>Not enough history data to display chart.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-base-200 p-3">
                  <div className="opacity-60">Current Value</div>
                  <div className="text-xl font-bold">{formatCurrency(selectedCategory.value)}</div>
                </div>
                <div className="rounded-lg bg-base-200 p-3">
                  <div className="opacity-60">Allocation</div>
                  <div className="text-xl font-bold">{selectedCategory.actual_percentage.toFixed(2)}%</div>
                </div>
              </div>
            </>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {sortedCategories.map((cat) => {
          const isUncategorized = cat.id === 'uncategorized';
          const diff = cat.actual_percentage - cat.target_percentage;
          const isBalanced = Math.abs(diff) <= 1.0;
          const isOverweight = diff > 1.0;
          const isUnderweight = diff < -1.0;

          let statusColor = 'text-success';
          let badgeClass = 'badge-success/10 text-success border-success/20';
          let Icon = FiCheck;
          let statusText = 'On Target';
          let progressColor = 'progress-success';
          let rebalanceHint = '';

          const lastHistory = history.length > 0 ? history[history.length - 1] : null;
          const prevAlloc = lastHistory?.allocation.find((a) => a.category_id === cat.id);
          const dailyPnl = prevAlloc ? cat.value - prevAlloc.value : 0;
          const isProfit = dailyPnl >= 0;

          if (isUncategorized) {
          } else if (isOverweight) {
            statusColor = 'text-error';
            badgeClass = 'badge-error/10 text-error border-error/20';
            Icon = FiArrowUp;
            statusText = `Overweight (+${diff.toFixed(1)}%)`;
            progressColor = 'progress-error';
            rebalanceHint = 'Consider trimming';
          } else if (isUnderweight) {
            statusColor = 'text-warning';
            badgeClass = 'badge-warning/10 text-warning border-warning/20';
            Icon = FiArrowDown;
            statusText = `Underweight (${diff.toFixed(1)}%)`;
            progressColor = 'progress-warning';
            rebalanceHint = 'Consider adding';
          } else if (isBalanced) {
            statusColor = 'text-success';
            badgeClass = 'badge-success/10 text-success border-success/20';
            Icon = FiCheck;
            statusText = 'Balanced';
          }

          if (isUncategorized) {
            return (
              <div
                key={cat.id}
                className="card bg-warning/5 border-warning relative overflow-hidden border shadow-md transition-all hover:shadow-lg"
              >
                <div className="text-warning/10 absolute -top-6 -right-6">
                  <FiAlertTriangle size={120} />
                </div>
                <div className="card-body relative z-10">
                  <h3 className="card-title text-warning flex items-center gap-2">
                    <FiAlertTriangle /> Action Needed
                  </h3>
                  <p className="text-sm opacity-80">
                    You have{' '}
                    <span className="font-bold">{formatCurrency(cat.value)}</span>{' '}
                    in uncategorized assets.
                  </p>
                  <div className="card-actions mt-4 justify-end">
                    <Link href="/positions" className="btn btn-warning btn-sm">
                      Fix Positions
                    </Link>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={cat.id}
              onClick={() => handleCardClick(cat)}
              className="card bg-base-100 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer border-2"
              style={{ borderColor: cat.color || 'transparent' }}
            >
              <div className="card-body p-5">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold tracking-wider uppercase opacity-50">
                      {cat.name}
                    </span>
                    <span className="text-2xl font-extrabold tracking-tight">
                      {formatCurrency(cat.value)}
                    </span>
                    {prevAlloc && (
                      <div className={`flex items-center text-xs font-bold ${isProfit ? 'text-success' : 'text-error'} mt-1`}>
                        {isProfit ? <FiArrowUp className="mr-1" /> : <FiArrowDown className="mr-1" />}
                        {formatCurrency(Math.abs(dailyPnl))}
                      </div>
                    )}
                  </div>
                  <div className={`badge ${badgeClass} gap-1 text-xs font-bold`}>
                    <Icon /> {statusText}
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={statusColor}>
                      {cat.actual_percentage.toFixed(1)}% Actual
                    </span>
                    <span className="opacity-50">
                      {cat.target_percentage.toFixed(1)}% Target
                    </span>
                  </div>
                  <progress
                    className={`progress w-full ${progressColor}`}
                    value={cat.actual_percentage}
                    max={cat.target_percentage > 0 ? cat.target_percentage : 100}
                  ></progress>
                </div>

                {!isBalanced && (
                  <div className="mt-3 flex items-center gap-1 text-xs opacity-60">
                    <FiActivity />
                    {rebalanceHint}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
