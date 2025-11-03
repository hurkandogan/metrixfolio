'use client';

import { formatCurrency } from '@/utils/functions';
import { FC, useEffect, useState, ChangeEvent } from 'react';

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
  currentValue,
}) => {
  const [data, setData] = useState<GrowthStep[]>([]);
  const [rateInput, setRateInput] = useState<number>(10);

  useEffect(() => {
    const growthRate = rateInput / 100;
    const generatedData: GrowthStep[] = [];
    let currentLoopValue = startingAmount;
    for (let i = 1; i <= steps; i++) {
      const growth = currentLoopValue * growthRate;
      const nextValue = currentLoopValue + growth;

      generatedData.push({
        step: i,
        startValue: currentLoopValue,
        growthAmount: growth,
        endValue: nextValue,
      });
      currentLoopValue = nextValue;
    }
    setData(generatedData);
  }, [startingAmount, steps, rateInput]);

  const handleRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newRate = e.target.value ? parseFloat(e.target.value) : 0;
    setRateInput(newRate);
  };

  const totalPercentageGain =
    ((currentValue - startingAmount) / startingAmount) * 100;

  return (
    <>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="card-title">Growth Targets</h2>
            <div className="form-control">
              <label className="input-group input-group-sm">
                <span className="bg-base-200"></span>
                <input
                  type="number"
                  value={rateInput}
                  onChange={handleRateChange}
                  className="input input-bordered input-sm w-20 text-right"
                  step={0.5}
                  min={0}
                />
                <span>%</span>
              </label>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-x-auto overflow-y-auto lg:max-h-[600px]">
            <table className="table-zebra table-pin-rows table-pin-footer table w-full">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Start Value</th>
                  <th className="text-success">Target</th>
                  <th className="font-bold">Last total</th>
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
