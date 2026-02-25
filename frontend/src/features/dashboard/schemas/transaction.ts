import { z } from "zod"
import type { ReactNode } from "react";


// shared 
export type TransactionsProps = {
  children: ReactNode;
};

export type Category = {
  id: number;
  name: string;
};

export type Transaction = {
  amount: number;
  category_id: number;
  description: string;
  transaction_date: string;
  transaction_type: string;
};



// Create Transaction tsx

// schema for data validation
const amountRegex = /^\d+(\.\d{1,2})?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;  

export const transactionSchema = z.object({
  amount: z
    .number()
    .refine(val => amountRegex.test(val.toString()), {
      message: "Amount must be a number with at most 2 decimal places"
    })
    .refine(val => val > 0, { message: "Please enter a valid amount" })
    .refine(val => val <= 999999999999, { message: "Amount exceeds the limit" }),

  category_id: z
    .number()
    .min(1, { message: "Please choose a category" })
    .refine(val => val !== 0, { message: "Category is required" }),

  description: z
    .string()
    .min(1, { message: "Description is required" }),

  transaction_date: z
    .string()
    .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" }),

  transaction_type: z
    .enum(["Expense", "Income"], { message: "Invalid transaction type" })
});

export type TransactionCreate = z.infer<typeof transactionSchema>;


// View Transactions tsx no need zod, because of pydantic schemas backend
export type ReadTransaction = {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  transaction_type: "Expense" | "Income";
  description: string;
  transaction_date: string;
  created_at: string;
  deleted_at: string | null;
};



// Transaction History tsx no need zod, because of pydantic schemas backend
export type ReadTransactionHistory = {
  id: number; 
  entity_id: number;
  user_id: number;
  old_description: string | null;
  new_description: string | null;
  old_transaction_date: string | null;
  new_transaction_date: string | null;
  action: "updated" | "deleted";
  action_taken_at: string;
};

