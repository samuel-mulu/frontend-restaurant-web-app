/**
 * Utility to format report data into a text format suitable for thermal printers
 */
export interface ReportData {
  title: string;
  dateRange: string;
  totalSales: number;
  totalExpenses: number;
  netRevenue: number;
  sections: {
    paymentBreakdown?: boolean;
    expenses?: boolean;
    cashierPerformance?: boolean;
    menuPerformance?: boolean;
    inventoryPerformance?: boolean;
  };
  details: {
    salesByPayment?: any[];
    expenses?: any[];
    cashierPerformance?: any[];
    menuPerformance?: any[];
    inventoryPerformance?: any[];
  };
}

export function formatReportForThermal(data: ReportData): string {
  const line = "================================";
  const dash = "--------------------------------";
  
  let text = "";
  
  // Header
  text += `${centerAlign(data.title)}\n`;
  text += `${centerAlign(data.dateRange)}\n`;
  text += `${line}\n\n`;
  
  // Financial Summary (Required)
  text += `TOTAL SALES:     ${formatCurrency(data.totalSales)}\n`;
  text += `TOTAL EXPENSES:  ${formatCurrency(data.totalExpenses)}\n`;
  text += `${dash}\n`;
  text += `NET REVENUE:     ${formatCurrency(data.netRevenue)}\n`;
  text += `\n${line}\n`;
  
  // Optional Sections
  if (data.sections.paymentBreakdown && data.details.salesByPayment?.length) {
    text += `${centerAlign("PAYMENT BREAKDOWN")}\n`;
    data.details.salesByPayment.forEach(item => {
      text += `${padString(item._id.method, 15)} ${formatCurrency(item.total).padStart(15)}\n`;
    });
    text += `${dash}\n`;
  }
  
  if (data.sections.expenses && data.details.expenses?.length) {
    const REASON_LABELS: Record<string, string> = {
      inventory: "Inventory Purchase",
      withdrawal: "General Withdrawal",
      salary_advance: "Salary Advance",
      broke_products: "Broke Products",
      utility: "Utilities / Repairs",
      other: "Other",
    };
    const EXPENSE_CATEGORY_ORDER = [
      "inventory",
      "withdrawal",
      "salary_advance",
      "broke_products",
      "utility",
      "other",
    ];

    const expenses = data.details.expenses;
    const flatItems = expenses.flatMap((entry: any) =>
      entry?.items ? entry.items : [entry]
    );
    const grouped = flatItems.reduce((acc: Record<string, any[]>, ex: any) => {
      const key = ex.reason || "other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(ex);
      return acc;
    }, {});

    text += `${centerAlign("EXPENSES")}\n`;
    EXPENSE_CATEGORY_ORDER.forEach((key) => {
      const items = grouped[key];
      if (!items?.length) return;
      const label = REASON_LABELS[key] || key.replace("_", " ");
      text += `  ${label}\n`;
      items.forEach((ex: any) => {
        const payment =
          ex.expenseType === "mobile_banking" ? "Mobile" : "Cash";
        const desc = (ex.description || "—").substring(0, 12);
        text += `    ${padString(desc, 14)} ${padString(payment, 8)} ${formatCurrency(ex.amount).padStart(12)}\n`;
      });
      const subtotal = items.reduce((s: number, ex: any) => s + ex.amount, 0);
      text += `    ${padString("Subtotal", 22)} ${formatCurrency(subtotal).padStart(12)}\n`;
    });
    text += `${dash}\n`;
  }
  
  if (data.sections.cashierPerformance && data.details.cashierPerformance?.length) {
    text += `${centerAlign("CASHIER PERFORMANCE")}\n`;
    data.details.cashierPerformance.forEach(item => {
      text += `${padString(item.name, 15)} ${formatCurrency(item.revenue).padStart(15)}\n`;
    });
    text += `${dash}\n`;
  }
  
  if (data.sections.menuPerformance && data.details.menuPerformance?.length) {
    text += `${centerAlign("MENU PERFORMANCE")}\n`;
    data.details.menuPerformance.forEach(item => {
      text += `${padString(item.name, 20)} ${String(item.quantity).padStart(10)}\n`;
    });
    text += `${dash}\n`;
  }

  if (data.sections.inventoryPerformance && data.details.inventoryPerformance?.length) {
    text += `${centerAlign("INVENTORY PERFORMANCE")}\n`;
    data.details.inventoryPerformance.forEach(item => {
      text += `${padString(item.name, 20)} ${String(item.quantity).padStart(10)}\n`;
    });
    text += `${dash}\n`;
  }
  
  text += `\n\n${centerAlign("END OF REPORT")}\n`;
  text += `${centerAlign(new Date().toLocaleString())}\n\n\n\n\n`; // Extra spacing for tear-off
  
  return text;
}

function centerAlign(text: string, width = 32): string {
  if (text.length >= width) return text.substring(0, width);
  const leftPadding = Math.floor((width - text.length) / 2);
  return " ".repeat(leftPadding) + text;
}

function padString(text: string, length: number): string {
  if (text.length >= length) return text.substring(0, length);
  return text + " ".repeat(length - text.length);
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2) + " Br";
}

/**
 * Utility to convert data to CSV
 */
export function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      const val = obj[header];
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(",")
  );
  
  return [headers.join(","), ...rows].join("\n");
}
