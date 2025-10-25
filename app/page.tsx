import { StatCards } from '@/components/dashboard/StatCards';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { GoalTable } from '@/components/dashboard/GoalTable';

const targetData = [
  { name: 'Growth', value: 60 },
  { name: 'Cash', value: 15 },
  { name: 'High Risk', value: 10 },
  { name: 'Options', value: 10 },
  { name: 'Metal', value: 5 },
];

const actualData = [
  { name: 'Growth', value: 34.53 },
  { name: 'Cash', value: 8.89 },
  { name: 'High Risk', value: 45.92 },
  { name: 'Options', value: 11.07 },
  { name: 'Metal', value: 0 },
];

export default function Dashboard() {
  return (
    <>
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <StatCards
          totalValue={2078.47}
          currentTarget={220.0}
          totalProfit={1536.72}
          profitPercentage={87.32}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GoalTable
              startingAmount={200}
              steps={50}
              growthRate={0.1}
              currentValue={201}
            />
          </div>

          <div className="flex flex-col gap-6">
            <AllocationChart title="Target" data={targetData} />
            <AllocationChart title="Actual" data={actualData} />
          </div>
        </div>
      </div>
    </>
  );
}
