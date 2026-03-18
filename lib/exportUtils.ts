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
    text += `${centerAlign("EXPENSES")}\n`;
    data.details.expenses.forEach((entry: any) => {
      const items = entry?.items ? entry.items : [entry];
      items.forEach((ex: any) => {
        text += `${padString((ex.reason || "").replace("_", " "), 15)} ${formatCurrency(ex.amount).padStart(15)}\n`;
      });
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
