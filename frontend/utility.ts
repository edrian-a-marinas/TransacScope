import api from "./src/services/apiClient";
import type { Transaction, Category } from "./src/features/dashboard/schemas/transaction";


export const formatDate = (date: string | null) => {
  if (!date) return "No Date";
  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) return "Invalid Date";

  // Get the components of the date and time
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const hours = parsedDate.getHours();
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
  const isAM = hours < 12;
  const formattedHours = hours % 12 || 12; // Convert to 12-hour format
  const amPm = isAM ? "AM" : "PM";

  // Format the date as 'YYYY-MM-DD, HH:mm AM/PM'
  return `${year}-${month}-${day}, ${formattedHours}:${minutes} ${amPm}`;
};


export const formatCurrency = (value: number | string) => {
  const numValue = Number(value);
  const isNegative = numValue < 0;
  const absoluteValue = Math.abs(numValue);

  // Format the absolute value as currency (with the default currency symbol, but we will remove the symbol)
  let formattedValue = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteValue);

  // Remove the currency symbol (₱) from the formatted string
  formattedValue = formattedValue.replace("₱", "");

  // If the value is negative, prepend the minus sign before the formatted number
  return isNegative ? `₱ -${formattedValue}` : `₱ ${formattedValue}`;
};


export type OnCloseProps = {
  onClose: () => void;
};


export async function fetchTransactionAndCategories(id: number): Promise<{
  transaction: Transaction;
  categories: Category[];
}> {
  const [transRes, catRes] = await Promise.all([
    api.get(`api/transactions/${id}`),
    api.get("api/categories/"),
  ]);

  return {
    transaction: transRes.data,
    categories: catRes.data,
  };
}