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
    startAmount: 200,
    targetAmount: 1000000,
    growthRate: 10,
    milestones: [],
  });

  const [tableData, setTableData] = useState<any[]>([]);

  // 1. Config Yükleme (Sadece user değişince çalışır)
  useEffect(() => {
    if (!user) return;
    getGrowthWidgetAction(user.uid).then((data) => {
      if (data) setConfig(data);
    });
  }, [user]);

  // 2. Milestone Kontrolü (Value değişince çalışır)
  useEffect(() => {
    if (!user || currentValue <= 0) return;

    // Debounce: Değer her değiştiğinde değil, değişim durduktan 1sn sonra kontrol et
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

  // 2. Tablo Hesaplama (FIXED)
  useEffect(() => {
    const rows = [];
    let currentStepStart = config.startAmount; // <--- DÜZELTME: Direkt startAmount ile başlıyoruz
    let step = 1;
    const rate = 0.1; // 10% fixed growth rate

    // Tabloyu sonsuza kadar uzatmak yerine, mevcut değerin 2 katına kadar veya en az 20 adım gösterelim.
    const stopValue = Math.max(currentValue * 2, config.startAmount * 10);

    while (true) {
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

      if (currentStepStart > stopValue && step > 20) break;
      if (step > 1000) break; // Safety break
    }
    setTableData(rows);
  }, [config, currentValue]);

  // 3. Otomatik Scroll
  useEffect(() => {
    if (activeRowRef.current) {
      // 'block: center' tüm sayfayı kaydırabilir, 'nearest' sadece container içinde görünür yapar.
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [tableData]);

  // --- FİLTRELEME MANTIĞI ---
  // Aktif satırın indeksini bul
  const activeIndex = tableData.findIndex(
    (row) => currentValue >= row.start && currentValue < row.end,
  );

  // Eğer aktif satır yoksa (hedef bittiyse), listenin sonunu baz al
  const safeActiveIndex =
    activeIndex === -1 ? tableData.length - 1 : activeIndex;

  // Sadece son 5 tamamlanan adımı + aktif adımı + gelecek adımları göster
  const startIndex = Math.max(0, safeActiveIndex - 5);
  const visibleRows = tableData.slice(startIndex);

  return (
    <div className="card bg-base-100 border-base-200 flex h-full flex-col border shadow-xl">
      <div className="card-body flex-none p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="card-title text-lg">🚀 Growth Targets</h2>
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
              <th>Progress</th> {/* YENİ KOLON */}
              <th>Gap (To Go)</th> {/* YENİ KOLON */}
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              // Mantık: Şu anki param, bu adımın başlangıcından büyük ama bitişinden küçükse -> BURADAYIM
              const isCompleted = currentValue >= row.end;
              const isActive =
                currentValue >= row.start && currentValue < row.end;

              // Hedefe ne kadar kaldı?
              const gap = row.end - currentValue;

              // İlerleme Yüzdesi (Sadece bu adım için)
              // Formül: (Mevcut - Başlangıç) / (Bitiş - Başlangıç)
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

              return (
                <tr
                  key={row.step}
                  ref={isActive ? activeRowRef : null} // Referansı aktif satıra veriyoruz
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

                  {/* HEDEF DEĞERİ */}
                  <td
                    className={`font-mono font-bold ${isCompleted ? 'text-success' : ''}`}
                  >
                    {formatCurrency(row.end)}
                  </td>

                  {/* PROGRESS BAR */}
                  <td className="w-32 align-middle">
                    {isActive ? (
                      <div className="flex flex-col gap-1">
                        <progress
                          className="progress progress-primary w-full"
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
    </div>
  );
};
