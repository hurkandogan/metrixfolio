'use client';

import { formatCurrency } from '@/utils/functions';
import { FC, useEffect, useState } from 'react';

interface GrowthStep {
  step: number;
  startValue: number;
  growthAmount: number;
  endValue: number;
}
interface GoalTableProps {
  startingAmount: number;
  steps: number;
  growthRate: number;
  currentValue: number;
}

export const GoalTable: FC<GoalTableProps> = ({
  startingAmount,
  steps,
  growthRate,
  currentValue,
}) => {
  const [data, setData] = useState<GrowthStep[]>([]);

  useEffect(() => {
    const generatedData: GrowthStep[] = [];
    let currentValue = startingAmount;
    for (let i = 1; i <= steps; i++) {
      const growth = currentValue * growthRate;
      const nextValue = currentValue + growth;

      generatedData.push({
        step: i,
        startValue: currentValue,
        growthAmount: growth,
        endValue: nextValue,
      });
      currentValue = nextValue;
    }
    setData(generatedData);
  }, [startingAmount, steps, growthRate]);

  const totalPercentageGain =
    ((currentValue - startingAmount) / startingAmount) * 100;

  return (
    <>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">10% Growth Targets</h2>
          <div className="max-h-[70vh] overflow-x-auto overflow-y-auto lg:max-h-[600px]">
            <table className="table-zebra table-pin-rows table-pin-footer table w-full">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Start Value</th>
                  <th>Target</th>
                  <th>Last total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const isActive =
                    currentValue >= row.startValue &&
                    currentValue < row.endValue;
                  return (
                    <tr
                      key={row.step}
                      className={`hover ${isActive ? 'border-primary border-2' : ''}`}
                    >
                      <th>{row.step}</th>
                      <td>{formatCurrency(row.startValue)}</td>
                      <td className="text-success font-medium">
                        {formatCurrency(row.growthAmount)}
                      </td>
                      <td className="font-bold">
                        {formatCurrency(row.endValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-base-200 text-base-content text-lg font-bold">
                  <td colSpan={3}>Total cumulative income</td>
                  <td className="text-success">
                    {totalPercentageGain.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};
