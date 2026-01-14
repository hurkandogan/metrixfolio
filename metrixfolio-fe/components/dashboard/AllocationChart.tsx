'use client';
import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface AllocationChartProps {
  title: string;
  data: ChartData[];
}

const COLORS = ['#3ABFF8', '#8280FF', '#F471B5', '#FFC80A', '#36D399'];

export const AllocationChart: React.FC<AllocationChartProps> = ({
  title,
  data,
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{title}</h2>
          <div className="skeleton h-64 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        {/* 'ResponsiveContainer' grafiğin kartın içine sığmasını sağlar */}
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80} // Dış yarıçap
                fill="#8884d8"
                dataKey="value" // 'data' içindeki 'value' anahtarını kullan
                // Etiketleri (label) grafiğin dışında göster
                label={(entry) => `${entry.name} (${entry.value}%)`}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              {/* <Tooltip
                formatter={(value: number) => parseFloat(value.toFixed(2))}
               /> */}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
