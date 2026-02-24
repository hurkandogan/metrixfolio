'use client';
import { formatCurrency } from '@/utils/functions';
import { FC, useEffect, useState, useRef } from 'react';
import { FiCheckCircle, FiTarget } from 'react-icons/fi';
import {
  checkMilestonesAction,
  getGrowthWidgetAction,
  GrowthWidgetData,
} from '@/actions/widget-actions';
import { useAuth } from '@/context/AuthProvider';

interface GoalTableProps {
  currentValue: number;
}

export const GoalTable: FC<GoalTableProps> = ({ currentValue }) => {
  const { user } = useAuth();
  const activeRowRef = useRef<HTMLTableRowElement>(null); // Aktif satır referansı

  const [config, setConfig] = useState<GrowthWidgetData>({
    growthRate: 10,
    milestones: [],
  });

  const [tableData, setTableData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    getGrowthWidgetAction(user.uid).then((data) => {
      if (data) setConfig(data);
    });
  }, [user]);

  useEffect(() => {
    if (!user || currentValue <= 0) return;

    const timer = setTimeout(() => {
      const runCheck = async () => {
        const res = await checkMilestonesAction(user.uid, currentValue);
        if (res?.success && res.newMilestones) {
          setConfig((prev) => ({ ...prev, milestones: res.newMilestones }));
        }
      };
      runCheck();
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, currentValue]);

  useEffect(() => {
    const rows = [];
    const BASE_AMOUNT = 1000;
    const rate = (config.growthRate || 10) / 100;

    let activeStep = 1;
    if (currentValue > BASE_AMOUNT) {
      activeStep =
        Math.floor(Math.log(currentValue / BASE_AMOUNT) / Math.log(1 + rate)) +
        1;
    }

    const startStep = Math.max(1, activeStep - 5);
    const endStep = activeStep + 10;

    for (let step = startStep; step <= endStep; step++) {
      const start = BASE_AMOUNT * Math.pow(1 + rate, step - 1);
      const end = BASE_AMOUNT * Math.pow(1 + rate, step);
      const growth = end - start;
      const milestone = config.milestones?.find((m) => m.step === step);
      rows.push({
        step,
        start: start,
        growth: growth,
        end: end,
        reachedDate: milestone?.date || null,
      });
    }
    setTableData(rows);
  }, [config, currentValue]);

  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [tableData]);

  const visibleRows = tableData;

  return (
    <div className="card bg-base-100 border-base-200 flex h-full flex-col border shadow-xl">
      <div className="card-body flex-none p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="card-title text-lg">Growth Targets 🚀</h2>
        </div>
      </div>

      <div className="max-h-125 flex-1 overflow-x-auto overflow-y-auto">
        <table className="table-pin-rows table-xs md:table-sm table">
          <thead>
            <tr>
              <th>#</th>
              <th>Start</th>
              <th>Target (End)</th>
              <th>Progress</th>
              <th>Gap (To Go)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isCompleted = currentValue >= row.end;
              const isActive =
                currentValue >= row.start && currentValue < row.end;

              const gap = row.end - currentValue;

              const stepProgress = isActive
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      ((currentValue - row.start) / (row.end - row.start)) *
                        100,
                    ),
                  )
                : isCompleted
                  ? 100
                  : 0;

              const progressColor =
                stepProgress < 25
                  ? 'progress-error'
                  : stepProgress < 55
                    ? 'progress-warning'
                    : stepProgress < 80
                      ? 'progress-info'
                      : 'progress-success';

              return (
                <tr
                  key={row.step}
                  ref={isActive ? activeRowRef : null}
                  className={
                    isActive
                      ? 'bg-primary/5 border-primary border-l-4 shadow-sm'
                      : isCompleted
                        ? 'opacity-60 transition-opacity hover:opacity-100'
                        : ''
                  }
                >
                  <td className="font-bold opacity-50">{row.step}</td>
                  <td className="font-mono">{formatCurrency(row.start)}</td>

                  <td
                    className={`font-mono font-bold ${isCompleted ? 'text-success' : ''}`}
                  >
                    {formatCurrency(row.end)}
                  </td>

                  <td className="w-32 align-middle">
                    {isActive ? (
                      <div className="flex flex-col gap-1">
                        <progress
                          className={`progress w-full ${progressColor}`}
                          value={stepProgress}
                          max="100"
                        ></progress>
                        <span className="text-primary text-right text-[10px] font-bold">
                          {stepProgress.toFixed(1)}%
                        </span>
                      </div>
                    ) : isCompleted ? (
                      <div className="flex items-center gap-2">
                        <progress
                          className="progress progress-success w-full"
                          value="100"
                          max="100"
                        ></progress>
                      </div>
                    ) : (
                      <progress
                        className="progress w-full opacity-30"
                        value="0"
                        max="100"
                      ></progress>
                    )}
                  </td>

                  <td>
                    {isActive ? (
                      <span className="badge badge-sm badge-warning font-mono">
                        {formatCurrency(gap)} left
                      </span>
                    ) : isCompleted ? (
                      <span className="text-success text-xs">Done</span>
                    ) : (
                      <span className="opacity-30">-</span>
                    )}
                  </td>

                  <td>
                    {row.reachedDate ? (
                      <div className="badge badge-success badge-outline gap-1 text-xs whitespace-nowrap">
                        <FiCheckCircle /> {row.reachedDate}
                      </div>
                    ) : isActive ? (
                      <div className="text-primary flex animate-pulse items-center gap-1 text-xs font-bold">
                        <FiTarget /> Current Goal
                      </div>
                    ) : (
                      <span className="opacity-30">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
