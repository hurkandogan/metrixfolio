'use client';

import { FC } from 'react';
import { formatCurrency } from '@/utils/functions';
import {
  FiArrowUp,
  FiArrowDown,
  FiCheck,
  FiAlertTriangle,
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
  const sortedCategories = [...categories].sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        if (isUncategorized) {
          statusColor = 'text-warning';
          badgeClass = 'badge-warning/10 text-warning border-warning/20';
          Icon = FiAlertTriangle;
          statusText = 'Action Needed';
        } else if (isOverweight) {
          statusColor = 'text-error';
          badgeClass = 'badge-error/10 text-error border-error/20';
          Icon = FiArrowUp;
          statusText = `+${diff.toFixed(1)}% Over`;
        } else if (isUnderweight) {
          statusColor = 'text-warning';
          badgeClass = 'badge-warning/10 text-warning border-warning/20';
          Icon = FiArrowDown;
          statusText = `${diff.toFixed(1)}% Under`;
        } else if (isBalanced) {
          statusColor = 'text-success';
          badgeClass = 'badge-success/10 text-success border-success/20';
          Icon = FiCheck;
          statusText = 'Balanced';
        }

        return (
          <div
            key={cat.id}
            className={`card bg-base-100 border shadow-sm transition-all hover:shadow-md ${isUncategorized ? 'border-warning' : 'border-base-200'}`}
          >
            <div className="card-body p-5">
              {/* ÜST KISIM: İsim ve Durum Rozeti */}
              <div className="mb-2 flex items-start justify-between">
                <h3 className="card-title text-sm font-medium opacity-70">
                  {cat.name}
                </h3>
                <div className={`badge ${badgeClass} gap-1 font-semibold`}>
                  <Icon className="h-3 w-3" />
                  {statusText}
                </div>
              </div>

              {/* ORTA KISIM: Değer */}
              <div className="font-mono text-2xl font-bold tracking-tight">
                {formatCurrency(cat.value)}
              </div>

              {/* ALT KISIM: Target vs Actual */}
              {!isUncategorized && (
                <div className="border-base-200 mt-3 flex items-center justify-between border-t pt-3 text-xs">
                  <div className="flex flex-col">
                    <span className="opacity-50">Actual</span>
                    <span className={`font-bold ${statusColor}`}>
                      {cat.actual_percentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Dikey Ayırıcı Çizgi */}
                  <div className="bg-base-300 mx-2 h-6 w-px"></div>

                  <div className="flex flex-col text-right">
                    <span className="opacity-50">Target</span>
                    <span className="font-bold">
                      {cat.target_percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {isUncategorized && (
                <div className="border-base-200 text-warning mt-3 border-t pt-3 text-xs">
                  These assets are not included in your strategy. Please
                  categorize them.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
