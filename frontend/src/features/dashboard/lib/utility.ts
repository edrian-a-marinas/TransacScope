import api from "../../../services/apiClient";
import type { Transaction, Category } from "../schemas/transaction";

export type OnCloseProps = {
  onClose: () => void;
};


// formats

export const formatDate = (date: string | null) => {
  if (!date) return "No Date";
  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) return "Invalid Date";

  // Get the components of the date and time
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0'); 
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const hours = parsedDate.getHours();
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
  const isAM = hours < 12;
  const formattedHours = hours % 12 || 12; 
  const amPm = isAM ? "AM" : "PM";

  return `${year}-${month}-${day}, ${formattedHours}:${minutes} ${amPm}`;
};

export const formatCurrency = (value: number | string) => {
  const numValue = Number(value);
  const isNegative = numValue < 0;
  const absoluteValue = Math.abs(numValue);

  let formattedValue = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteValue);

  formattedValue = formattedValue.replace("₱", "");

  return isNegative ? `₱ -${formattedValue}` : `₱ ${formattedValue}`;
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

export const diffHighlight = (before: string, after: string) => {
  const beforeWords = before.split(/(\s+)/); // keep spaces
  const afterWords = after.split(/(\s+)/);

  let resultBefore = "";
  let resultAfter = "";

  const maxLen = Math.max(beforeWords.length, afterWords.length);

  for (let i = 0; i < maxLen; i++) {
    const b = beforeWords[i] || "";
    const a = afterWords[i] || "";

    if (b === a) {
      // No changes, just append the word as is
      resultBefore += b;
      resultAfter += a;
    } else {
      // For "Before" (removed characters, in red)
      for (let j = 0; j < b.length; j++) {
        if (a[j] !== b[j]) {
          resultBefore += `<span style="color: red;">${b[j]}</span>`;
        } else {
          resultBefore += b[j];
        }
      }

      // For "After" (added characters, in green/bold)
      for (let j = 0; j < a.length; j++) {
        if (b[j] !== a[j]) {
          resultAfter += `<span style="color: green; font-weight: bold;">${a[j]}</span>`;
        } else {
          resultAfter += a[j];
        }
      }
    }
  }

  return { before: resultBefore, after: resultAfter };
};


import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
