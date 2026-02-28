"use client";

import {
    CategoryRevenueChart,
    DayOfWeekChart,
    InventoryTrendChart,
    OrdersByStatusChart,
    OrderTimingDistributionChart,
    OrderVolumeChart,
    PaymentMethodChart,
    PeakHoursChart,
    RevenueTrendChart,
    StaffPerformanceChart,
    TablePerformanceChart,
    TopSellingItemsChart,
} from "@/components/features/AnalyticsCharts";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useGetComprehensiveAnalyticsQuery } from "@/stores/features/statistics/statisticsApi";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Calendar,
    CalendarDays,
    Clock,
    DollarSign,
    Download,
    Package,
    ShoppingCart,
    Table,
    Timer,
    TrendingUp,
    Users,
    XCircle,
} from "lucide-react";
import { useState } from "react";

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeQuickRange, setActiveQuickRange] = useState<number | null>(30);

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useGetComprehensiveAnalyticsQuery({
    startDate,
    endDate,
  });

  const formatCurrency = (value: number) => {
    return `Br ${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const handleQuickRangeWithState = (days: number) => {
    setActiveQuickRange(days);
    handleQuickRange(days);
  };

  if (isLoading) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load analytics"
        onRetry={() => refetch()}
      />
    );
  }

  if (!analytics) {
    return <LoadingState message="No data available" />;
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6">
      {/* Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Analytics Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor your restaurant&apos;s performance metrics and trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Range Control Bar */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800">
              <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Date Range
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filter data by time period
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveQuickRange(null);
                }}
                className="h-9 border-0 bg-transparent focus-visible:ring-0 w-auto text-sm"
              />
              <span className="text-slate-400 text-xs font-medium px-1">
                TO
              </span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveQuickRange(null);
                }}
                className="h-9 border-0 bg-transparent focus-visible:ring-0 w-auto text-sm"
              />
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => handleQuickRangeWithState(days)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    activeQuickRange === days
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                  )}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(analytics.summary?.totalRevenue || 0)}
          subtext="Gross revenue for selected period"
          icon={DollarSign}
          trend="up"
          accentColor="emerald"
        />
        <KPICard
          title="Total Orders"
          value={analytics.summary?.totalOrders?.toString() || "0"}
          subtext="Total processed orders"
          icon={ShoppingCart}
          trend="up"
          accentColor="blue"
        />
        <KPICard
          title="Avg Order Value"
          value={formatCurrency(analytics.summary?.averageOrderValue || 0)}
          subtext="Revenue per order"
          icon={TrendingUp}
          trend="neutral"
          accentColor="purple"
        />
        <KPICard
          title="Low Stock Items"
          value={analytics.summary?.lowStockItemsCount?.toString() || "0"}
          subtext="Items below threshold"
          icon={AlertTriangle}
          trend="down"
          accentColor="rose"
          isAlert={true}
        />
      </div>

      {/* Additional KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Staff"
          value={analytics.summary?.activeStaffCount?.toString() || "0"}
          subtext="Currently active staff members"
          icon={Users}
          trend="neutral"
          accentColor="blue"
        />
        <KPICard
          title="Voided Orders"
          value={analytics.summary?.voidedOrdersCount?.toString() || "0"}
          subtext={`${analytics.voids?.voidRate?.toFixed(1) || "0"}% void rate`}
          icon={XCircle}
          trend="down"
          accentColor="rose"
        />
        <KPICard
          title="Avg Completion Time"
          value={`${
            analytics.summary?.averageOrderCompletionTime?.toFixed(1) || "0"
          } min`}
          subtext="Average order completion time"
          icon={Timer}
          trend="neutral"
          accentColor="purple"
        />
        <KPICard
          title="Busiest Day"
          value={analytics.summary?.busiestDay || "N/A"}
          subtext={`Peak hour: ${analytics.summary?.busiestHour || 0}:00`}
          icon={CalendarDays}
          trend="neutral"
          accentColor="emerald"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="cashflow" className="w-full space-y-6">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-slate-200 dark:border-slate-800 rounded-none space-x-6 overflow-x-auto">
          <TabTrigger value="cashflow" icon={DollarSign} label="Cash Flow" />
          <TabTrigger
            value="menu"
            icon={ShoppingCart}
            label="Menu Performance"
          />
          <TabTrigger value="inventory" icon={Package} label="Inventory" />
          <TabTrigger value="orders" icon={Clock} label="Order Activity" />
          <TabTrigger value="staff" icon={Users} label="Staff Performance" />
          <TabTrigger value="tables" icon={Table} label="Table Analytics" />
          <TabTrigger value="timing" icon={Timer} label="Timing Metrics" />
        </TabsList>

        <TabsContent value="cashflow" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard title="Revenue Trend" className="lg:col-span-2">
              <RevenueTrendChart
                data={analytics.cashFlow?.revenueTrend || []}
              />
            </ChartCard>
            <ChartCard title="Payment Methods">
              <PaymentMethodChart
                data={analytics.cashFlow?.paymentMethodBreakdown || []}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ComparisonCard
              title="Today"
              current={analytics.cashFlow?.revenueComparison?.today || 0}
              previous={analytics.cashFlow?.revenueComparison?.yesterday || 0}
              periodLabel="Yesterday"
              formatCurrency={formatCurrency}
            />
            <ComparisonCard
              title="This Week"
              current={analytics.cashFlow?.revenueComparison?.thisWeek || 0}
              previous={analytics.cashFlow?.revenueComparison?.lastWeek || 0}
              periodLabel="Last Week"
              formatCurrency={formatCurrency}
            />
            <ComparisonCard
              title="This Month"
              current={analytics.cashFlow?.revenueComparison?.thisMonth || 0}
              previous={analytics.cashFlow?.revenueComparison?.lastMonth || 0}
              periodLabel="Last Month"
              formatCurrency={formatCurrency}
            />
          </div>

          {analytics.cashFlow?.salesByCashier &&
            analytics.cashFlow.salesByCashier.length > 0 && (
              <ChartCard title="Sales by Cashier">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.cashFlow.salesByCashier
                      .slice(0, 6)
                      .map(
                        (cashier: {
                          cashierId: string;
                          cashierName: string;
                          total: number;
                          count: number;
                        }) => (
                          <div
                            key={cashier.cashierId}
                            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          >
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                              {cashier.cashierName}
                            </p>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                              {formatCurrency(cashier.total)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {cashier.count} orders
                            </p>
                          </div>
                        ),
                      )}
                  </div>
                </div>
              </ChartCard>
            )}
        </TabsContent>

        <TabsContent value="menu" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top Selling (Quantity)">
              <TopSellingItemsChart
                data={analytics.menu?.topSellingItems || []}
                type="quantity"
              />
            </ChartCard>
            <ChartCard title="Top Selling (Revenue)">
              <TopSellingItemsChart
                data={analytics.menu?.topSellingItems || []}
                type="revenue"
              />
            </ChartCard>
          </div>
          <ChartCard title="Revenue by Category">
            <CategoryRevenueChart
              data={analytics.menu?.revenueByCategory || []}
            />
          </ChartCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Top Selling Category"
              value={analytics.summary?.topSellingCategory || "N/A"}
            />
            <StatCard
              label="Total Menu Items Sold"
              value={(analytics.menu?.topSellingItems || [])
                .reduce(
                  (sum: number, item: { totalQty: number }) =>
                    sum + item.totalQty,
                  0,
                )
                .toString()}
            />
            <StatCard
              label="Top Item Revenue"
              value={
                analytics.menu?.topSellingItems?.[0]
                  ? formatCurrency(analytics.menu.topSellingItems[0].revenue)
                  : formatCurrency(0)
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top Inventory (Quantity)">
              <InventoryTrendChart
                data={analytics.inventory?.topSelling || []}
                type="quantity"
              />
            </ChartCard>
            <ChartCard title="Top Inventory (Value)">
              <InventoryTrendChart
                data={analytics.inventory?.topSelling || []}
                type="value"
              />
            </ChartCard>
          </div>

          {analytics.inventory?.lowStockItems &&
            analytics.inventory.lowStockItems.length > 0 && (
              <Card className="border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/50">
                      <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Low Stock Alerts
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.inventory.lowStockItems.map(
                      (item: {
                        inventoryId: string;
                        inventoryName: string;
                        quantity: number;
                        unit: string;
                      }) => (
                        <div
                          key={item.inventoryId}
                          className="flex justify-between items-center p-4 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900"
                        >
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {item.inventoryName}
                          </span>
                          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </Card>
            )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              label="Total Inventory Value"
              value={formatCurrency(analytics.inventory?.inventoryValue || 0)}
            />
            <StatCard
              label="Total Inventory Items"
              value={analytics.inventory?.totalItems?.toString() || "0"}
            />
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Order Volume Trend">
              <OrderVolumeChart
                data={analytics.orders?.orderVolumeTrend || []}
              />
            </ChartCard>
            <ChartCard title="Peak Hours">
              <PeakHoursChart data={analytics.orders?.peakHours || []} />
            </ChartCard>
          </div>
          <ChartCard title="Order Status Distribution">
            <OrdersByStatusChart
              data={analytics.orders?.ordersByStatus || {}}
            />
          </ChartCard>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Waiter Performance">
              <StaffPerformanceChart
                data={analytics.staff?.ordersByWaiter || []}
                type="waiter"
              />
            </ChartCard>
            <ChartCard title="Cashier Performance">
              <StaffPerformanceChart
                data={analytics.staff?.ordersByCashier || []}
                type="cashier"
              />
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              label="Total Orders"
              value={
                analytics.staff?.performanceMetrics?.totalOrders?.toString() ||
                "0"
              }
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(
                analytics.staff?.performanceMetrics?.totalRevenue || 0,
              )}
            />
            <StatCard
              label="Avg Order Value"
              value={formatCurrency(
                analytics.staff?.performanceMetrics?.avgOrderValue || 0,
              )}
            />
            <StatCard
              label="Orders Per Day"
              value={
                analytics.staff?.performanceMetrics?.ordersPerDay?.toFixed(1) ||
                "0"
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6 pt-2">
          <ChartCard title="Table Performance">
            <TablePerformanceChart data={analytics.tables?.topTables || []} />
          </ChartCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Total Tables"
              value={analytics.tables?.salesByTable?.length?.toString() || "0"}
            />
            <StatCard
              label="Top Table Revenue"
              value={
                analytics.tables?.topTables?.[0]
                  ? formatCurrency(analytics.tables.topTables[0].totalRevenue)
                  : formatCurrency(0)
              }
            />
            <StatCard
              label="Top Table Orders"
              value={
                analytics.tables?.topTables?.[0]?.orderCount?.toString() || "0"
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="timing" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Order Timing Distribution">
              <OrderTimingDistributionChart
                data={analytics.timing?.orderTimingDistribution || []}
              />
            </ChartCard>
            <ChartCard title="Sales by Day of Week">
              <DayOfWeekChart
                data={analytics.dayOfWeek?.salesByDayOfWeek || []}
              />
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Avg Completion Time"
              value={`${
                analytics.timing?.averageOrderCompletionTime?.toFixed(1) || "0"
              } min`}
            />
            <StatCard
              label="Avg Payment Time"
              value={`${
                analytics.timing?.averagePaymentTime?.toFixed(1) || "0"
              } min`}
            />
            <StatCard
              label="Avg Time to Cashier"
              value={`${
                analytics.timing?.averageTimeToCashier?.toFixed(1) || "0"
              } min`}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Subcomponents for cleaner code
function KPICard({
  title,
  value,
  subtext,
  icon: Icon,
  accentColor,
  isAlert,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  trend: "up" | "down" | "neutral";
  accentColor: "emerald" | "blue" | "purple" | "rose";
  isAlert?: boolean;
}) {
  const colors = {
    emerald:
      "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30",
    blue: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
    purple:
      "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30",
    rose: "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30",
  };

  return (
    <Card className="p-6 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {value}
          </h3>
        </div>
        <div className={cn("p-2 rounded-lg", colors[accentColor])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs">
        {isAlert ? (
          <span className="text-rose-600 font-medium flex items-center gap-1">
            Requires Attention
          </span>
        ) : (
          <span className="text-slate-400">{subtext}</span>
        )}
      </div>
    </Card>
  );
}

function TabTrigger({
  value,
  icon: Icon,
  label,
}: {
  value: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3 text-slate-600 dark:text-slate-400 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all gap-2"
    >
      <Icon className="h-4 w-4" />
      {label}
    </TabsTrigger>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden",
        className,
      )}
    >
      <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

function ComparisonCard({
  title,
  current,
  previous,
  periodLabel,
  formatCurrency,
}: {
  title: string;
  current: number;
  previous: number;
  periodLabel: string;
  formatCurrency: (val: number) => string;
}) {
  const diff = current - previous;
  const percentage = previous > 0 ? (diff / previous) * 100 : 0;
  const isPositive = diff >= 0;

  return (
    <Card className="p-6 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
        {title}
      </p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {formatCurrency(current)}
        </h4>
      </div>
      {previous > 0 && (
        <div
          className={cn(
            "flex items-center gap-1 mt-2 text-xs font-medium",
            isPositive ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          <span>{Math.abs(percentage).toFixed(1)}%</span>
          <span className="text-slate-400 font-normal ml-1">
            vs {periodLabel}
          </span>
        </div>
      )}
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-6 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
        {value}
      </p>
    </Card>
  );
}
