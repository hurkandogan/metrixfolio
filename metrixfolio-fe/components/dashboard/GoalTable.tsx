'use client';

import { formatCurrency } from '@/utils/functions';
import { FC, useEffect, useState, useRef } from 'react';
import { FiSettings, FiCheckCircle, FiTarget } from 'react-icons/fi';
import {
  saveGrowthSettingsAction,
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
  const modalRef = useRef<HTMLDialogElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement>(null); // Aktif satır referansı

  const [config, setConfig] = useState<GrowthWidgetData>({
    startAmount: 200,
    targetAmount: 1000000,
    growthRate: 10,
    milestones: [],
  });

  const [tableData, setTableData] = useState<any[]>([]);

  // 1. Veri Yükleme
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const data = await getGrowthWidgetAction(user.uid);
      if (data) {
        setConfig(data);
        await checkMilestonesAction(user.uid, currentValue);
      }
    };
    init();
  }, [user, currentValue]);

  // 2. Tablo Hesaplama (FIXED)
  useEffect(() => {
    const rows = [];
    let currentStepStart = config.startAmount; // <--- DÜZELTME: Direkt startAmount ile başlıyoruz
    let step = 1;
    const rate = config.growthRate / 100;

    // Hedefe kadar döngü
    while (currentStepStart < config.targetAmount) {
      const growthAmount = currentStepStart * rate;
      const endValue = currentStepStart + growthAmount;

      // Milestone Eşleşmesi (Database'den gelen)
      const milestone = config.milestones?.find((m) => m.step === step);

      rows.push({
        step,
        start: currentStepStart,
        growth: growthAmount,
        end: endValue,
        reachedDate: milestone?.date || null,
      });

      // Bir sonraki adımın başlangıcı, bu adımın bitişidir
      currentStepStart = endValue;
      step++;

      if (step > 200) break;
    }
    setTableData(rows);
  }, [config]);

  // 3. Otomatik Scroll
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [tableData]);

  // Ayar Kaydetme
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await saveGrowthSettingsAction(user.uid, config);
    modalRef.current?.close();
  };

  return (
    <div className="card bg-base-100 border-base-200 flex h-full flex-col border shadow-xl">
      <div className="card-body flex-none p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="card-title text-lg">🚀 Growth Targets</h2>
          <button
            onClick={() => modalRef.current?.showModal()}
            className="btn btn-ghost btn-sm"
          >
            <FiSettings />
          </button>
        </div>
      </div>

      {/* Tablo Alanı (Scrollable) */}
      <div className="max-h-[500px] flex-1 overflow-x-auto overflow-y-auto">
        <table className="table-pin-rows table-xs md:table-sm table">
          <thead>
            <tr>
              <th>#</th>
              <th>Start</th>
              <th>Target (End)</th>
              <th>Gap (To Go)</th> {/* YENİ KOLON */}
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => {
              // Mantık: Şu anki param, bu adımın başlangıcından büyük ama bitişinden küçükse -> BURADAYIM
              const isCompleted = currentValue >= row.end;
              const isActive =
                currentValue >= row.start && currentValue < row.end;

              // Hedefe ne kadar kaldı?
              const gap = row.end - currentValue;

              return (
                <tr
                  key={row.step}
                  ref={isActive ? activeRowRef : null} // Referansı aktif satıra veriyoruz
                  className={
                    isActive
                      ? 'bg-primary/10 border-primary scroll-mt-20 border-l-4'
                      : ''
                  }
                >
                  <td className="font-bold opacity-50">{row.step}</td>
                  <td className="font-mono">{formatCurrency(row.start)}</td>

                  {/* HEDEF DEĞERİ */}
                  <td
                    className={`font-mono font-bold ${isCompleted ? 'text-success' : ''}`}
                  >
                    {formatCurrency(row.end)}
                  </td>

                  {/* FARK (GAP) */}
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

                  {/* TARİH */}
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

      {/* SETTINGS MODAL (AYNI KALSIN) */}
      <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="mb-4 text-lg font-bold">Widget Settings</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="form-control">
              <label className="label">Starting Amount ($)</label>
              <input
                type="number"
                className="input input-bordered"
                value={config.startAmount}
                onChange={(e) =>
                  setConfig({ ...config, startAmount: Number(e.target.value) })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">Target Amount ($)</label>
              <input
                type="number"
                className="input input-bordered"
                value={config.targetAmount}
                onChange={(e) =>
                  setConfig({ ...config, targetAmount: Number(e.target.value) })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">Growth Rate (%)</label>
              <input
                type="number"
                className="input input-bordered"
                step="0.1"
                value={config.growthRate}
                onChange={(e) =>
                  setConfig({ ...config, growthRate: Number(e.target.value) })
                }
              />
            </div>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn">Close</button>
              </form>
              <button className="btn btn-primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};
