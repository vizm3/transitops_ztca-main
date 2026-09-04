import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download, FileText, TrendingUp, DollarSign, Fuel, ShieldCheck, Printer } from 'lucide-react';
import { AnalyticsMetric, AnalyticsSummary, Vehicle, Trip, Expense } from '../types';

interface ReportsProps {
  analytics: {
    metrics: AnalyticsMetric[];
    summary: AnalyticsSummary;
  } | null;
  rawVehicles: Vehicle[];
  rawTrips: Trip[];
  rawExpenses: Expense[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export default function Reports({
  analytics,
  rawVehicles,
  rawTrips,
  rawExpenses
}: ReportsProps) {
  if (!analytics || !analytics.metrics) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400 shadow-sm">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-neutral-300 animate-bounce" />
        Processing real-time operational analytics...
      </div>
    );
  }

  const { metrics, summary } = analytics;

  // Pie chart data: operational cost category breakdown
  const pieData = [
    { name: 'Fuel Costs', value: metrics.reduce((sum, m) => sum + m.totalFuelCost, 0) },
    { name: 'Maintenance Costs', value: metrics.reduce((sum, m) => sum + m.totalMaintCost, 0) },
    {
      name: 'Misc (Tolls/Permits)',
      value: rawExpenses
        .filter(e => e.category !== 'Fuel' && e.category !== 'Maintenance')
        .reduce((sum, e) => sum + e.cost, 0)
    }
  ].filter(item => item.value > 0);

  // Bar chart data: Vehicle ROI rank
  const roiData = metrics.map(m => ({
    registrationNumber: m.registrationNumber,
    name: m.name,
    ROI: Math.round(m.roi * 10) / 10 // round to 1 decimal
  }));

  // Bar chart data: Fuel efficiency
  const fuelEfficiencyData = metrics.map(m => ({
    registrationNumber: m.registrationNumber,
    name: m.name,
    Efficiency: Math.round(m.fuelEfficiency * 10) / 10 // round to 1 decimal
  })).filter(m => m.Efficiency > 0);

  // Trigger CSV Export
  const exportCSV = () => {
    // 1. Generate vehicle registry CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'TRANSITOPS GENERAL FLEET PERFORMANCE REPORT\r\n';
    csvContent += `Generated: ${new Date().toLocaleString()}\r\n\r\n`;

    csvContent += 'VEHICLE PERFORMANCE METRICS\r\n';
    csvContent += 'Reg Number,Vehicle Name,Type,Total Distance (km),Fuel Cost ($),Maintenance Cost ($),Total Opex ($),Est Revenue ($),ROI (%)\r\n';
    
    metrics.forEach(m => {
      csvContent += `"${m.registrationNumber}","${m.name}","${m.type}",${m.totalDistance},${m.totalFuelCost},${m.totalMaintCost},${m.totalOperationalCost},${m.estimatedRevenue},${m.roi}%\r\n`;
    });

    csvContent += '\r\n\r\nRAW OPERATIONAL EXPENSES LOGS\r\n';
    csvContent += 'Expense ID,Date,Category,Vehicle,Description,Cost\r\n';

    rawExpenses.forEach(e => {
      const v = rawVehicles.find(item => item.id === e.vehicleId);
      const reg = v ? v.registrationNumber : 'General';
      csvContent += `"${e.id}","${e.date}","${e.category}","${reg}","${e.description.replace(/"/g, '""')}",${e.cost}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TransitOps_Fleet_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-tab-panel" className="space-y-6 print:p-8 print:bg-white">
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">Operational Intelligence & ROI Reports</h2>
          <p className="text-sm text-neutral-500">Analyze financial ROI, fleet fuel efficiency, and expense distribution charts</p>
        </div>
        <div className="flex gap-2">
          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="px-3 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="h-4 w-4" /> Print PDF Report
          </button>
          <button
            id="export-csv-btn"
            onClick={exportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Download className="h-4 w-4" /> Export Operations CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">Est. Dispatch Revenue</span>
            <span className="text-xl font-bold text-neutral-800 font-mono">
              ${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">Total Operational Cost</span>
            <span className="text-xl font-bold text-neutral-800 font-mono">
              ${summary.totalOperationalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">Avg. Fleet Fuel Efficiency</span>
            <span className="text-xl font-bold text-neutral-800 font-mono">
              {Math.round(summary.avgFuelEfficiency * 10) / 10} km/Liter
            </span>
          </div>
        </div>
      </div>

      {/* Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost distribution Pie Chart */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[380px] print:break-inside-avoid">
          <h3 className="font-bold text-neutral-800 text-sm mb-4">Operational Expense Distribution</h3>
          {pieData.length === 0 ? (
            <div className="text-center py-20 text-neutral-400 text-xs">
              No logged financial expenses to render charts.
            </div>
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 justify-around">
              <div className="w-[180px] h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-neutral-600 font-semibold">{item.name}:</span>
                    <span className="font-bold text-neutral-800 font-mono">${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vehicle ROI Bar Chart */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm min-h-[380px] print:break-inside-avoid">
          <h3 className="font-bold text-neutral-800 text-sm mb-4">Vehicle Return on Investment (ROI %)</h3>
          <div className="w-full h-[260px] text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="registrationNumber" stroke="#888888" tickLine={false} />
                <YAxis stroke="#888888" tickLine={false} unit="%" />
                <Tooltip formatter={(value) => [`${value}% ROI`, 'Return']} />
                <Legend iconSize={10} verticalAlign="top" height={36} />
                <Bar name="ROI %" dataKey="ROI" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fuel Efficiency bar chart */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm min-h-[380px] lg:col-span-2 print:break-inside-avoid">
          <h3 className="font-bold text-neutral-800 text-sm mb-4">Vehicle Fuel Efficiency Comparison (km/Liter)</h3>
          {fuelEfficiencyData.length === 0 ? (
            <div className="text-center py-24 text-neutral-400 text-xs">
              No completed delivery logs or fuel purchases recorded yet to gauge fuel efficiency.
            </div>
          ) : (
            <div className="w-full h-[260px] text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelEfficiencyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="registrationNumber" stroke="#888888" tickLine={false} />
                  <YAxis stroke="#888888" tickLine={false} unit=" km/L" />
                  <Tooltip formatter={(value) => [`${value} km/Liter`, 'Fuel Efficiency']} />
                  <Legend iconSize={10} verticalAlign="top" height={36} />
                  <Bar name="Efficiency (km/L)" dataKey="Efficiency" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
