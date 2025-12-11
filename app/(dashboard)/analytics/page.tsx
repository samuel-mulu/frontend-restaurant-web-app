"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Clock,
} from "lucide-react";
import { useGetComprehensiveAnalyticsQuery } from "@/stores/features/statistics/statisticsApi";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  RevenueTrendChart,
  PaymentMethodChart,
  TopSellingItemsChart,
  CategoryRevenueChart,
  OrderVolumeChart,
  InventoryTrendChart,
  OrdersByStatusChart,
  PeakHoursChart,
} from "@/components/features/AnalyticsCharts";
import { cn } from "@/lib/utils";

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

  const handleQuickRangeWithState = (days: number) => {
    setActiveQuickRange(days);
    handleQuickRange(days);
  };

  return (
    <div className="flex flex-col gap-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,transparent)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                Analytics Dashboard
              </h1>
              <p className="text-blue-100 text-sm">
                Comprehensive insights into your restaurant performance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Date Range Picker */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Label className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Date Range
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Select a time period to analyze
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 flex-1 sm:flex-initial">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveQuickRange(null);
                  }}
                  className="h-11 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg font-medium"
                />
                <span className="text-gray-400 dark:text-gray-500 font-medium">
                  to
                </span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveQuickRange(null);
                  }}
                  className="h-11 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg font-medium"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeQuickRange === 7 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickRangeWithState(7)}
                  className={cn(
                    "h-11 px-4 rounded-lg font-medium transition-all",
                    activeQuickRange === 7
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant={activeQuickRange === 30 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickRangeWithState(30)}
                  className={cn(
                    "h-11 px-4 rounded-lg font-medium transition-all",
                    activeQuickRange === 30
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant={activeQuickRange === 90 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickRangeWithState(90)}
                  className={cn(
                    "h-11 px-4 rounded-lg font-medium transition-all",
                    activeQuickRange === 90
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  Last 90 Days
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="p-1.5 rounded-full bg-white/20">
                <ArrowUpRight className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency(analytics.summary?.totalRevenue || 0)}
              </p>
              <p className="text-emerald-100/80 text-xs">All time revenue</p>
            </div>
          </div>
        </Card>

        {/* Orders Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div className="p-1.5 rounded-full bg-white/20">
                <ArrowUpRight className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">
                Total Orders
              </p>
              <p className="text-3xl font-bold text-white mb-2">
                {analytics.summary?.totalOrders || 0}
              </p>
              <p className="text-blue-100/80 text-xs">Orders processed</p>
            </div>
          </div>
        </Card>

        {/* Average Order Value Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="p-1.5 rounded-full bg-white/20">
                <ArrowUpRight className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">
                Avg Order Value
              </p>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency(analytics.summary?.averageOrderValue || 0)}
              </p>
              <p className="text-purple-100/80 text-xs">Per order average</p>
            </div>
          </div>
        </Card>

        {/* Low Stock Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-500 to-red-600 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="p-1.5 rounded-full bg-white/20">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <p className="text-rose-100 text-sm font-medium mb-1">
                Low Stock Items
              </p>
              <p className="text-3xl font-bold text-white mb-2">
                {analytics.summary?.lowStockItemsCount || 0}
              </p>
              <p className="text-rose-100/80 text-xs">Requires attention</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Enhanced Analytics Tabs */}
      <Tabs defaultValue="cashflow" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg rounded-xl p-1.5">
          <TabsTrigger
            value="cashflow"
            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger
            value="menu"
            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Menu Items
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold"
          >
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold"
          >
            <Clock className="h-4 w-4 mr-2" />
            Orders
          </TabsTrigger>
        </TabsList>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Revenue Trend
                  </h3>
                </div>
                <RevenueTrendChart
                  data={analytics.cashFlow?.revenueTrend || []}
                />
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Payment Method Breakdown
                  </h3>
                </div>
                <PaymentMethodChart
                  data={analytics.cashFlow?.paymentMethodBreakdown || []}
                />
              </div>
            </Card>
          </div>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Revenue Comparison
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Today
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {formatCurrency(
                      analytics.cashFlow?.revenueComparison?.today || 0
                    )}
                  </p>
                  {(analytics.cashFlow?.revenueComparison?.yesterday || 0) >
                    0 && (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        (analytics.cashFlow?.revenueComparison?.today || 0) >=
                          (analytics.cashFlow?.revenueComparison?.yesterday ||
                            0)
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {(analytics.cashFlow?.revenueComparison?.today || 0) >=
                      (analytics.cashFlow?.revenueComparison?.yesterday ||
                        0) ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(
                        (((analytics.cashFlow?.revenueComparison?.today || 0) -
                          (analytics.cashFlow?.revenueComparison?.yesterday ||
                            0)) /
                          (analytics.cashFlow?.revenueComparison?.yesterday ||
                            1)) *
                          100
                      ).toFixed(1)}
                      % vs Yesterday
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    This Week
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {formatCurrency(
                      analytics.cashFlow?.revenueComparison?.thisWeek || 0
                    )}
                  </p>
                  {(analytics.cashFlow?.revenueComparison?.lastWeek || 0) >
                    0 && (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        (analytics.cashFlow?.revenueComparison?.thisWeek ||
                          0) >=
                          (analytics.cashFlow?.revenueComparison?.lastWeek || 0)
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {(analytics.cashFlow?.revenueComparison?.thisWeek || 0) >=
                      (analytics.cashFlow?.revenueComparison?.lastWeek || 0) ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(
                        (((analytics.cashFlow?.revenueComparison?.thisWeek ||
                          0) -
                          (analytics.cashFlow?.revenueComparison?.lastWeek ||
                            0)) /
                          (analytics.cashFlow?.revenueComparison?.lastWeek ||
                            1)) *
                          100
                      ).toFixed(1)}
                      % vs Last Week
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    This Month
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {formatCurrency(
                      analytics.cashFlow?.revenueComparison?.thisMonth || 0
                    )}
                  </p>
                  {(analytics.cashFlow?.revenueComparison?.lastMonth || 0) >
                    0 && (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        (analytics.cashFlow?.revenueComparison?.thisMonth ||
                          0) >=
                          (analytics.cashFlow?.revenueComparison?.lastMonth ||
                            0)
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {(analytics.cashFlow?.revenueComparison?.thisMonth ||
                        0) >=
                      (analytics.cashFlow?.revenueComparison?.lastMonth ||
                        0) ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(
                        (((analytics.cashFlow?.revenueComparison?.thisMonth ||
                          0) -
                          (analytics.cashFlow?.revenueComparison?.lastMonth ||
                            0)) /
                          (analytics.cashFlow?.revenueComparison?.lastMonth ||
                            1)) *
                          100
                      ).toFixed(1)}
                      % vs Last Month
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="menu" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Top Selling Items (Quantity)
                  </h3>
                </div>
                <TopSellingItemsChart
                  data={analytics.menu?.topSellingItems || []}
                  type="quantity"
                />
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                    <DollarSign className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Top Selling Items (Revenue)
                  </h3>
                </div>
                <TopSellingItemsChart
                  data={analytics.menu?.topSellingItems || []}
                  type="revenue"
                />
              </div>
            </Card>
          </div>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Revenue by Category
                </h3>
              </div>
              <CategoryRevenueChart
                data={analytics.menu?.revenueByCategory || []}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Top Inventory Items (Quantity)
                  </h3>
                </div>
                <InventoryTrendChart
                  data={analytics.inventory?.topSelling || []}
                  type="quantity"
                />
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                    <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Top Inventory Items (Value)
                  </h3>
                </div>
                <InventoryTrendChart
                  data={analytics.inventory?.topSelling || []}
                  type="value"
                />
              </div>
            </Card>
          </div>

          {analytics.inventory?.lowStockItems &&
            analytics.inventory.lowStockItems.length > 0 && (
              <Card className="shadow-lg bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-2 border-red-200 dark:border-red-800">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Low Stock Items
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
                          className="p-4 rounded-xl border-2 border-red-200 dark:border-red-800 bg-white dark:bg-slate-800/50 hover:shadow-md transition-shadow"
                        >
                          <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {item.inventoryName}
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            {item.quantity} {item.unit}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </Card>
            )}

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Total Inventory Value
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(analytics.inventory?.inventoryValue || 0)}
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Total Items
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {analytics.inventory?.totalItems || 0}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Order Volume Trend
                  </h3>
                </div>
                <OrderVolumeChart
                  data={analytics.orders?.orderVolumeTrend || []}
                />
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Peak Hours
                  </h3>
                </div>
                <PeakHoursChart data={analytics.orders?.peakHours || []} />
              </div>
            </Card>
          </div>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Orders by Status
                </h3>
              </div>
              <OrdersByStatusChart
                data={analytics.orders?.ordersByStatus || {}}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
