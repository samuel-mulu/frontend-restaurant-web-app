"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Chart colors from globals.css
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
];

interface RevenueTrendChartProps {
  data: Array<{ date: string; total: number; count: number }>;
  period?: "daily" | "weekly" | "monthly";
}

export function RevenueTrendChart({
  data,
  period = "daily",
}: RevenueTrendChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="date"
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <YAxis
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
          tickFormatter={(value) => `Br ${value.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number) => [`Br ${value.toLocaleString()}`, "Revenue"]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          name="Revenue"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface PaymentMethodChartProps {
  data: Array<{ method: string; total: number; count: number }>;
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    name: item.method === "cash" ? "Cash" : "Mobile Banking",
    value: item.total,
    count: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {formattedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number, name: string, props: any) => [
            `Br ${value.toLocaleString()} (${props.payload.count} orders)`,
            name,
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface TopSellingItemsChartProps {
  data: Array<{ itemId: string; itemName: string; totalQty: number; revenue: number }>;
  type?: "quantity" | "revenue";
}

export function TopSellingItemsChart({
  data,
  type = "quantity",
}: TopSellingItemsChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const sortedData = [...data]
    .sort((a, b) => (type === "quantity" ? b.totalQty - a.totalQty : b.revenue - a.revenue))
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="itemName"
          angle={-45}
          textAnchor="end"
          height={100}
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <YAxis
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
          tickFormatter={(value) =>
            type === "quantity"
              ? value.toLocaleString()
              : `Br ${value.toLocaleString()}`
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number) => [
            type === "quantity"
              ? `${value} units`
              : `Br ${value.toLocaleString()}`,
            type === "quantity" ? "Quantity" : "Revenue",
          ]}
        />
        <Legend />
        <Bar
          dataKey={type === "quantity" ? "totalQty" : "revenue"}
          fill={CHART_COLORS[1]}
          name={type === "quantity" ? "Quantity Sold" : "Revenue"}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CategoryRevenueChartProps {
  data: Array<{ categoryId: string; categoryName: string; revenue: number; itemCount: number }>;
}

export function CategoryRevenueChart({ data }: CategoryRevenueChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ categoryName, percent }) =>
            `${categoryName}: ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="revenue"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number, name: string, props: any) => [
            `Br ${value.toLocaleString()} (${props.payload.itemCount} items)`,
            props.payload.categoryName,
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface OrderVolumeChartProps {
  data: Array<{ date: string; count: number; total: number }>;
}

export function OrderVolumeChart({ data }: OrderVolumeChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="date"
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <YAxis
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number) => [value, "Orders"]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="count"
          stroke={CHART_COLORS[2]}
          strokeWidth={2}
          name="Order Count"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface InventoryTrendChartProps {
  data: Array<{ inventoryId: string; inventoryName: string; quantity: number; value: number }>;
  type?: "quantity" | "value";
}

export function InventoryTrendChart({
  data,
  type = "quantity",
}: InventoryTrendChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const sortedData = [...data]
    .sort((a, b) => (type === "quantity" ? b.quantity - a.quantity : b.value - a.value))
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="inventoryName"
          angle={-45}
          textAnchor="end"
          height={100}
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <YAxis
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
          tickFormatter={(value) =>
            type === "quantity"
              ? value.toLocaleString()
              : `Br ${value.toLocaleString()}`
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number) => [
            type === "quantity"
              ? `${value} units`
              : `Br ${value.toLocaleString()}`,
            type === "quantity" ? "Quantity" : "Value",
          ]}
        />
        <Legend />
        <Bar
          dataKey={type === "quantity" ? "quantity" : "value"}
          fill={CHART_COLORS[3]}
          name={type === "quantity" ? "Quantity" : "Value"}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface OrdersByStatusChartProps {
  data: {
    OPEN: number;
    VOIDED: number;
    PAID_TO_CASHIER: number;
    TRANSFERRED_TO_OWNER: number;
    OWNER_CONFIRMED: number;
    DISPUTED: number;
  };
}

export function OrdersByStatusChart({ data }: OrdersByStatusChartProps) {
  if (!data || typeof data !== "object") {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const chartData = Object.entries(data).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    value: count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <YAxis
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Legend />
        <Bar dataKey="value" fill={CHART_COLORS[4]} name="Order Count" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PeakHoursChartProps {
  data: Array<{ hour: number; count: number }>;
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    hour: `${item.hour}:00`,
    count: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="hour"
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <YAxis
          className="text-xs text-gray-600 dark:text-gray-400"
          tick={{ fill: "currentColor" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Legend />
        <Bar dataKey="count" fill={CHART_COLORS[0]} name="Orders" />
      </BarChart>
    </ResponsiveContainer>
  );
}

