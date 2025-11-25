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
  Save,
  TestTube,
} from "lucide-react";
import { posPrinterService } from "@/stores/features/posPrinter/posPrinterApi";
import {
  POSPrinterHealth,
  PrinterConfiguration,
  AvailableDevices,
} from "@/lib/types";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POS_PRINT_KEY =
  process.env.NEXT_PUBLIC_POS_PRINT_KEY || "pos-printer-secret-key-2024";

export default function PrinterManagementPage() {
  const auth = useRequireAuth({
    allowedRoles: ["cashier", "waiter"],
    redirectTo: "/",
  });

  const [health, setHealth] = useState<POSPrinterHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [lastTestPrintSuccess, setLastTestPrintSuccess] = useState<
    boolean | null
  >(null);

  // Configuration state
  const [config, setConfig] = useState<PrinterConfiguration>({
    interface: "mock",
    usbName: null,
    serialPort: null,
    maxRetries: 3,
    retryDelayMs: 1000,
  });
  const [availableDevices, setAvailableDevices] =
    useState<AvailableDevices | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

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

  // Fetch configuration
  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const result = await posPrinterService.getConfig();
      if (result.success) {
        setConfig(result.config);
        setConfigError(null);
      } else {
        setConfigError(result.error || "Failed to load configuration");
      }
    } catch (error) {
      setConfigError(
        error instanceof Error ? error.message : "Failed to load configuration"
      );
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch available devices
  const fetchAvailableDevices = async () => {
    try {
      const result = await posPrinterService.getAvailableDevices();
      setAvailableDevices(result);
    } catch (error) {
      console.error("Failed to fetch available devices:", error);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchHealth();
    fetchConfig();
    fetchAvailableDevices();
    const interval = setInterval(fetchHealth, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Test print function
  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    setLastTestPrintSuccess(null);
    try {
      const result = await posPrinterService.testPrint();
      if (result.success) {
        setLastTestPrintSuccess(true);
        toast.success("Test print sent successfully!", {
          description: "Check your printer for the test receipt",
        });
        // Refresh health to update queue status
        setTimeout(fetchHealth, 1000);
        // Clear success message after 10 seconds
        setTimeout(() => setLastTestPrintSuccess(null), 10000);
      } else {
        setLastTestPrintSuccess(false);
        toast.error("Test print failed", {
          description: result.error || result.message,
        });
      }
    } catch (error) {
      setLastTestPrintSuccess(false);
      toast.error("Failed to send test print", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsTestingPrint(false);
    }
  };

  // Test connection with current configuration
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConfigError(null);
    try {
      const result = await posPrinterService.testConnection(config);
      if (result.success && result.connected) {
        toast.success("Connection test successful!", {
          description: "Printer is ready to use",
        });
      } else {
        toast.warning("Connection test completed", {
          description:
            result.error ||
            result.message ||
            "Printer may not be connected or ready",
        });
      }
    } catch (error) {
      toast.error("Connection test failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Save configuration
  const handleSaveConfig = async () => {
    // Validate configuration
    if (config.interface === "usb" && !config.usbName) {
      setConfigError("USB printer name is required");
      toast.error("Configuration Error", {
        description: "Please select a USB printer",
      });
      return;
    }

    if (config.interface === "serial" && !config.serialPort) {
      setConfigError("Serial port is required");
      toast.error("Configuration Error", {
        description: "Please select a serial port",
      });
      return;
    }

    setIsSavingConfig(true);
    setConfigError(null);
    try {
      const result = await posPrinterService.updateConfig(config);
      if (result.success) {
        toast.success("Configuration saved successfully!", {
          description: "Printer configuration has been updated",
        });
        // Refresh health and config
        setTimeout(() => {
          fetchHealth();
          fetchConfig();
        }, 1000);
      } else {
        setConfigError(result.error || "Failed to save configuration");
        toast.error("Failed to save configuration", {
          description: result.error || "Unknown error",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save configuration";
      setConfigError(errorMessage);
      toast.error("Failed to save configuration", {
        description: errorMessage,
      });
    } finally {
      setIsSavingConfig(false);
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
    const recommendations: Array<{
      text: string;
      type: "success" | "info" | "warning" | "error";
    }> = [];

    // Show test print success message if available
    if (lastTestPrintSuccess === true) {
      recommendations.push({
        text: "✅ Test print completed successfully! Your printer is working correctly.",
        type: "success",
      });
    }

    if (!isServiceRunning) {
      recommendations.push(
        {
          text: "Start the POS Printer Service on this computer",
          type: "error",
        },
        {
          text: "Check if the service is running on port 7777",
          type: "error",
        },
        {
          text: "Verify the service is installed and configured correctly",
          type: "error",
        }
      );
    } else if (!isPrinterConnected) {
      recommendations.push(
        {
          text: "Check printer connection (USB cable or Bluetooth)",
          type: "warning",
        },
        {
          text: "Verify printer is powered on",
          type: "warning",
        },
        {
          text: "Check printer configuration in .env file",
          type: "warning",
        }
      );
    } else if (lastTestPrintSuccess !== true) {
      recommendations.push({
        text: "Everything looks good! Your printer is ready. Try a test print to verify.",
        type: "info",
      });
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
            {lastTestPrintSuccess === true ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            Recommendations
          </h2>
          <ul className="space-y-2">
            {getRecommendations().map((rec, index) => {
              const colorClass =
                rec.type === "success"
                  ? "text-green-600 dark:text-green-400"
                  : rec.type === "error"
                  ? "text-red-600 dark:text-red-400"
                  : rec.type === "warning"
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-muted-foreground";

              return (
                <li
                  key={index}
                  className={`flex items-start gap-2 ${colorClass}`}
                >
                  <span className="mt-1">
                    {rec.type === "success" ? "✅" : "•"}
                  </span>
                  <span className="font-medium">{rec.text}</span>
                </li>
              );
            })}
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

        {/* Printer Configuration */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Printer Configuration
            </h2>
            <Button
              onClick={fetchAvailableDevices}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Devices
            </Button>
          </div>

          {configError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">
                {configError}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Interface Type */}
            <div>
              <Label htmlFor="interface">Printer Interface</Label>
              <Select
                value={config.interface}
                onValueChange={(value: "usb" | "serial" | "mock") => {
                  setConfig({
                    ...config,
                    interface: value,
                    usbName: value === "usb" ? config.usbName : null,
                    serialPort: value === "serial" ? config.serialPort : null,
                  });
                  setConfigError(null);
                }}
                disabled={isLoadingConfig || isSavingConfig}
              >
                <SelectTrigger id="interface" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock (Development)</SelectItem>
                  <SelectItem value="usb">USB Printer</SelectItem>
                  <SelectItem value="serial">Serial/Bluetooth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* USB Printer Selection */}
            {config.interface === "usb" && (
              <div>
                <Label htmlFor="usbName">USB Printer</Label>
                {availableDevices?.usbPrinters &&
                availableDevices.usbPrinters.length > 0 ? (
                  <Select
                    value={config.usbName || ""}
                    onValueChange={(value) => {
                      setConfig({ ...config, usbName: value });
                      setConfigError(null);
                    }}
                    disabled={isLoadingConfig || isSavingConfig}
                  >
                    <SelectTrigger id="usbName" className="mt-2">
                      <SelectValue placeholder="Select USB printer" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDevices.usbPrinters.map((printer) => (
                        <SelectItem key={printer} value={printer}>
                          {printer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="usbName"
                    value={config.usbName || ""}
                    onChange={(e) => {
                      setConfig({ ...config, usbName: e.target.value });
                      setConfigError(null);
                    }}
                    placeholder="Enter USB printer name"
                    className="mt-2"
                    disabled={isLoadingConfig || isSavingConfig}
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {availableDevices?.usbPrinters &&
                  availableDevices.usbPrinters.length === 0
                    ? "No USB printers detected. Enter printer name manually."
                    : "Select a printer from the list or enter manually."}
                </p>
              </div>
            )}

            {/* Serial Port Selection */}
            {config.interface === "serial" && (
              <div>
                <Label htmlFor="serialPort">Serial Port (COM Port)</Label>
                {availableDevices?.serialPorts &&
                availableDevices.serialPorts.length > 0 ? (
                  <Select
                    value={config.serialPort || ""}
                    onValueChange={(value) => {
                      setConfig({ ...config, serialPort: value });
                      setConfigError(null);
                    }}
                    disabled={isLoadingConfig || isSavingConfig}
                  >
                    <SelectTrigger id="serialPort" className="mt-2">
                      <SelectValue placeholder="Select serial port" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDevices.serialPorts.map((port) => (
                        <SelectItem key={port} value={port}>
                          {port}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="serialPort"
                    value={config.serialPort || ""}
                    onChange={(e) => {
                      setConfig({ ...config, serialPort: e.target.value });
                      setConfigError(null);
                    }}
                    placeholder="Enter COM port (e.g., COM1, COM3)"
                    className="mt-2"
                    disabled={isLoadingConfig || isSavingConfig}
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {availableDevices?.serialPorts &&
                  availableDevices.serialPorts.length === 0
                    ? "No serial ports detected. Enter port manually (e.g., COM1)."
                    : "Select a serial port from the list or enter manually."}
                </p>
              </div>
            )}

            {/* Advanced Settings */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <Label htmlFor="maxRetries">Max Retries</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  min="1"
                  max="10"
                  value={config.maxRetries}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      maxRetries: parseInt(e.target.value) || 3,
                    });
                  }}
                  className="mt-2"
                  disabled={isLoadingConfig || isSavingConfig}
                />
              </div>
              <div>
                <Label htmlFor="retryDelayMs">Retry Delay (ms)</Label>
                <Input
                  id="retryDelayMs"
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={config.retryDelayMs}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      retryDelayMs: parseInt(e.target.value) || 1000,
                    });
                  }}
                  className="mt-2"
                  disabled={isLoadingConfig || isSavingConfig}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleTestConnection}
                disabled={
                  isTestingConnection ||
                  isSavingConfig ||
                  !isServiceRunning ||
                  (config.interface === "usb" && !config.usbName) ||
                  (config.interface === "serial" && !config.serialPort)
                }
                variant="outline"
                className="flex items-center gap-2"
              >
                {isTestingConnection ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveConfig}
                disabled={
                  isSavingConfig ||
                  isTestingConnection ||
                  !isServiceRunning ||
                  (config.interface === "usb" && !config.usbName) ||
                  (config.interface === "serial" && !config.serialPort)
                }
                className="flex items-center gap-2"
              >
                {isSavingConfig ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Configuration Info */}
        {health && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Service Information
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
