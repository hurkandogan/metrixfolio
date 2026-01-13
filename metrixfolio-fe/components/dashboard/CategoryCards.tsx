'use client';

import { FC } from 'react';
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

interface CategoryData {
  id: string;
  name: string;
  value: number;
  actual_percentage: number;
  target_percentage: number;
}

interface CategoryCardsProps {
  categories: CategoryData[];
}

export const CategoryCards: FC<CategoryCardsProps> = ({ categories }) => {
  // Uncategorized her zaman en başta olsun, diğerleri değere göre sıralansın
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.id === 'uncategorized') return -1;
    if (b.id === 'uncategorized') return 1;
    return b.value - a.value;
  });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {sortedCategories.map((cat) => {
        const isUncategorized = cat.id === 'uncategorized';

        const diff = cat.actual_percentage - cat.target_percentage;
        const isBalanced = Math.abs(diff) <= 1.0;
        const isOverweight = diff > 1.0;
        const isUnderweight = diff < -1.0;

        let statusColor = 'text-success';
        let borderColor = 'border-base-200';
        let badgeClass = 'badge-success/10 text-success border-success/20';
        let Icon = FiCheck;
        let statusText = 'On Target';
        let progressColor = 'progress-success';
        let rebalanceHint = '';

        if (isUncategorized) {
          // Özel render yapılacak
        } else if (isOverweight) {
          statusColor = 'text-error';
          borderColor = 'border-error/30';
          badgeClass = 'badge-error/10 text-error border-error/20';
          Icon = FiArrowUp;
          statusText = `Overweight (+${diff.toFixed(1)}%)`;
          progressColor = 'progress-error';
          rebalanceHint = 'Consider trimming';
        } else if (isUnderweight) {
          statusColor = 'text-warning';
          borderColor = 'border-warning/30';
          badgeClass = 'badge-warning/10 text-warning border-warning/20';
          Icon = FiArrowDown;
          statusText = `Underweight (${diff.toFixed(1)}%)`;
          progressColor = 'progress-warning';
          rebalanceHint = 'Consider adding';
        } else if (isBalanced) {
          statusColor = 'text-success';
          borderColor = 'border-success/30';
          badgeClass = 'badge-success/10 text-success border-success/20';
          Icon = FiCheck;
          statusText = 'Balanced';
        }

        // --- ÖZEL DURUM: UNCATEGORIZED ---
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

        // --- STANDART KART ---
        return (
          <div
            key={cat.id}
            className={`card bg-base-100 border shadow-sm transition-all duration-300 hover:shadow-md ${borderColor}`}
          >
            <div className="card-body p-5">
              {/* ÜST KISIM: İsim ve Durum Rozeti */}
              <div className="mb-2 flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider uppercase opacity-50">
                    {cat.name}
                  </span>
                  <span className="text-2xl font-extrabold tracking-tight">
                    {formatCurrency(cat.value)}
                  </span>
                </div>
                <div className={`badge ${badgeClass} gap-1 text-xs font-bold`}>
                  <Icon /> {statusText}
                </div>
              </div>

              {/* PROGRESS BAR */}
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

              {/* REBALANCE HINT */}
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
  );
};
