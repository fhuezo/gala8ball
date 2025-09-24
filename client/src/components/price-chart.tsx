import { useEffect, useRef } from "react";
import { Chart, ChartConfiguration } from "chart.js/auto";

interface PriceChartProps {
  marketId: string;
}

export function PriceChart({ marketId }: PriceChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Mock data for price history - in real implementation, this would come from API
    const mockData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'YES Price',
        data: [0.45, 0.52, 0.58, 0.61, 0.65, 0.67],
        borderColor: 'hsl(173, 58%, 39%)',
        backgroundColor: 'hsl(173, 58%, 39%, 0.1)',
        fill: true,
        tension: 0.4
      }, {
        label: 'NO Price',
        data: [0.55, 0.48, 0.42, 0.39, 0.35, 0.33],
        borderColor: 'hsl(0, 84%, 60%)',
        backgroundColor: 'hsl(0, 84%, 60%, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    const config: ChartConfiguration = {
      type: 'line',
      data: mockData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'hsl(210, 40%, 98%)',
              usePointStyle: true
            }
          }
        },
        scales: {
          x: {
            ticks: { color: 'hsl(215, 20%, 65%)' },
            grid: { color: 'hsl(217, 32%, 17%)' }
          },
          y: {
            ticks: { 
              color: 'hsl(215, 20%, 65%)',
              callback: function(value) {
                return '$' + Number(value).toFixed(2);
              }
            },
            grid: { color: 'hsl(217, 32%, 17%)' },
            min: 0,
            max: 1
          }
        }
      }
    };

    chartInstance.current = new Chart(chartRef.current, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [marketId]);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Price History</h3>
      <div className="h-64">
        <canvas ref={chartRef} className="w-full h-full"></canvas>
      </div>
    </div>
  );
}
