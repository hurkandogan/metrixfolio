import { FC } from 'react';
import { formatCurrency } from '@/utils/functions';

interface StatCardsProps {
  totalValue: number;
  currentTarget: number;
  totalProfit: number;
  profitPercentage: number;
}

export const StatCards: FC<StatCardsProps> = ({
  totalValue,
  currentTarget,
  totalProfit,
  profitPercentage,
}) => {
  return (
    <>
      <div className="stats stats-vertical lg:stats-horizontal w-full shadow">
        <div className="stat">
          <div className="stat-title">Total Portfolio Value</div>
          <div className="stat-value text-primary">
            {formatCurrency(totalValue)}
          </div>
          <div className="stat-desc">
            {'Total Investment: ' + formatCurrency(441.75)}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Target</div>
          <div className="stat-value text-primary">
            {formatCurrency(currentTarget)}
          </div>
          <div className="stat-desc">{'Start: ' + formatCurrency(200)}</div>
        </div>

        <div className="stat">
          <div className="stat-title">P/L Total</div>
          <div className="stat-value text-success">
            {formatCurrency(totalProfit)}
          </div>
          <div className="stat-desc">
            ↗︎
            {profitPercentage.toFixed(2)}%
          </div>
        </div>
      </div>
    </>
  );
};
