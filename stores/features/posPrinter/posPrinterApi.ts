import { POSPrinterHealth, TestPrintResult } from "@/lib/types";

// POS Printer Service runs on localhost:7777
const POS_SERVICE_URL =
  process.env.NEXT_PUBLIC_POS_SERVICE_URL || "http://localhost:7777";
const POS_PRINT_KEY = process.env.NEXT_PUBLIC_POS_PRINT_KEY || "dev-key-12345";

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

  // Test print
  async testPrint(): Promise<TestPrintResult> {
    try {
      const testReceipt = `================================================
           3T JUICE
================================================

TEST RECEIPT
Date: ${new Date().toLocaleString()}

This is a test print from the
POS Printer Service Dashboard.

================================================
    Thank you for testing!
================================================`;

      const response = await fetch(`${POS_SERVICE_URL}/print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Print-Key": POS_PRINT_KEY,
        },
        body: JSON.stringify({
          data: testReceipt,
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
        message: "Print test failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
