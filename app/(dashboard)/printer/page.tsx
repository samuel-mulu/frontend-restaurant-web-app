"use client";

import React, { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  RefreshCw,
  Settings,
  Activity,
  Clock,
  FileText,
} from "lucide-react";
import { posPrinterService } from "@/stores/features/posPrinter/posPrinterApi";
import { POSPrinterHealth } from "@/lib/types";
import { toast } from "sonner";

const POS_PRINT_KEY = process.env.NEXT_PUBLIC_POS_PRINT_KEY || "dev-key-12345";

export default function PrinterManagementPage() {
  const auth = useRequireAuth({
    allowedRoles: ["cashier", "waiter"],
    redirectTo: "/",
  });

  const [health, setHealth] = useState<POSPrinterHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch health status
  const fetchHealth = async () => {
    try {
      const data = await posPrinterService.getHealth();
      setHealth(data);
      setLastUpdate(new Date());
    } catch (error) {
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Test print function
  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    try {
      const result = await posPrinterService.testPrint();
      if (result.success) {
        toast.success("Test print sent successfully!", {
          description: "Check your printer for the test receipt",
        });
        // Refresh health to update queue status
        setTimeout(fetchHealth, 1000);
      } else {
        toast.error("Test print failed", {
          description: result.error || result.message,
        });
      }
    } catch (error) {
      toast.error("Failed to send test print", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsTestingPrint(false);
    }
  };

  // Show loading while checking authorization
  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Checking authorization..." size="lg" />;
  }

  if (!auth.isAuthenticated || !auth.isAuthorized) {
    return null;
  }

  // Determine status
  const isServiceRunning = health !== null;
  const isPrinterConnected = health?.printerConnected ?? false;
  const statusColor =
    isServiceRunning && isPrinterConnected
      ? "text-green-600"
      : isServiceRunning
      ? "text-yellow-600"
      : "text-red-600";

  const statusIcon =
    isServiceRunning && isPrinterConnected ? (
      <CheckCircle2 className="h-5 w-5" />
    ) : isServiceRunning ? (
      <AlertCircle className="h-5 w-5" />
    ) : (
      <XCircle className="h-5 w-5" />
    );

  const statusText =
    isServiceRunning && isPrinterConnected
      ? "Connected"
      : isServiceRunning
      ? "Service Running (Printer Disconnected)"
      : "Service Unavailable";

  // Get recommendations
  const getRecommendations = () => {
    const recommendations: string[] = [];

    if (!isServiceRunning) {
      recommendations.push(
        "Start the POS Printer Service on this computer",
        "Check if the service is running on port 7777",
        "Verify the service is installed and configured correctly"
      );
    } else if (!isPrinterConnected) {
      recommendations.push(
        "Check printer connection (USB cable or Bluetooth)",
        "Verify printer is powered on",
        "Check printer configuration in .env file"
      );
    } else {
      recommendations.push("Everything looks good! Your printer is ready.");
    }

    return recommendations;
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Printer className="h-8 w-8" />
              POS Printer Service
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor and manage your receipt printer
            </p>
          </div>
          <Button
            onClick={fetchHealth}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Status Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`${statusColor} mt-1`}>{statusIcon}</div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Service Status
                </h2>
                <p className={`text-lg font-medium ${statusColor} mt-1`}>
                  {statusText}
                </p>
                {health && (
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span>
                        Interface:{" "}
                        <span className="font-medium text-foreground capitalize">
                          {health.interface || "Unknown"}
                        </span>
                      </span>
                    </div>
                    {health.printerName && (
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        <span>
                          Printer:{" "}
                          <span className="font-medium text-foreground">
                            {health.printerName}
                          </span>
                        </span>
                      </div>
                    )}
                    {health.serialPort && (
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>
                          COM Port:{" "}
                          <span className="font-medium text-foreground">
                            {health.serialPort}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Queue Status */}
        {health && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Print Queue
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Queue Length</p>
                <p className="text-2xl font-bold text-foreground">
                  {health.queue.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold text-foreground">
                  {health.queue.processing ? "Processing" : "Idle"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Recommendations */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recommendations
          </h2>
          <ul className="space-y-2">
            {getRecommendations().map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-muted-foreground"
              >
                <span className="text-primary mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="flex gap-4">
            <Button
              onClick={handleTestPrint}
              disabled={isTestingPrint || !isServiceRunning}
              className="flex items-center gap-2"
            >
              {isTestingPrint ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Test Print
                </>
              )}
            </Button>
            <Button
              onClick={fetchHealth}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh Status
            </Button>
          </div>
        </Card>

        {/* Configuration Info */}
        {health && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service URL:</span>
                <span className="font-mono text-foreground">
                  {process.env.NEXT_PUBLIC_POS_SERVICE_URL ||
                    "http://localhost:7777"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Print Key:</span>
                <span className="font-mono text-foreground">
                  {POS_PRINT_KEY
                    ? `••••${POS_PRINT_KEY.slice(-4)}`
                    : "Not configured"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Last Health Check:
                </span>
                <span className="text-foreground">
                  {health.timestamp
                    ? new Date(health.timestamp).toLocaleString()
                    : "Never"}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
