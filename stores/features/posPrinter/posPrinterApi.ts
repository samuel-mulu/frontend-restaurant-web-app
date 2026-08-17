import { brandReceiptText, branding } from "@/config/branding";
import { formatDateWithSystem, getStoredCalendarSystem } from "@/lib/calendar";
import {
    AvailableDevices,
    ConfigResponse,
    POSPrinterHealth,
    PrinterConfiguration,
    TestConnectionResult,
    TestPrintResult,
} from "@/lib/types";

// POS Printer Service runs on localhost:7777
const POS_SERVICE_URL =
  process.env.NEXT_PUBLIC_POS_SERVICE_URL || "http://localhost:7777";
const POS_PRINT_KEY =
  process.env.NEXT_PUBLIC_POS_PRINT_KEY || "pos-printer-secret-key-2024";

// Direct API calls to POS Printer Service (bypasses backend)
export const posPrinterService = {
  // Get health status
  async getHealth(): Promise<POSPrinterHealth> {
    try {
      const response = await fetch(`${POS_SERVICE_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Service unavailable
      throw new Error("POS Printer Service is not running");
    }
  },

  // Print arbitrary receipt data
  async print(data: string): Promise<TestPrintResult> {
    try {
      const response = await fetch(`${POS_SERVICE_URL}/print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Print-Key": POS_PRINT_KEY,
        },
        body: JSON.stringify({
          data: brandReceiptText(data),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Printing failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Test print
  async testPrint(): Promise<TestPrintResult> {
    const testReceipt = `================================================
        ${branding.name}
================================================

TEST RECEIPT
Date: ${formatDateWithSystem(getStoredCalendarSystem(), new Date(), { dateTime: true })}

This is a test print from the
POS Printer Service Dashboard.

================================================
    Thank you for testing!
================================================`;

    return this.print(testReceipt);
  },

  // Get current configuration
  async getConfig(): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${POS_SERVICE_URL}/config`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        config: {
          interface: "mock",
          usbName: null,
          serialPort: null,
          maxRetries: 3,
          retryDelayMs: 1000,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Get available devices (USB printers and serial ports)
  async getAvailableDevices(): Promise<AvailableDevices> {
    try {
      const response = await fetch(`${POS_SERVICE_URL}/config/available`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        usbPrinters: [],
        serialPorts: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Test connection with configuration (doesn't save)
  async testConnection(
    config: PrinterConfiguration
  ): Promise<TestConnectionResult> {
    try {
      const response = await fetch(`${POS_SERVICE_URL}/config/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Print-Key": POS_PRINT_KEY,
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Update configuration
  async updateConfig(
    config: PrinterConfiguration
  ): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${POS_SERVICE_URL}/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Print-Key": POS_PRINT_KEY,
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        config,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
