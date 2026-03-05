import type { ReadTransaction, Category } from "@/features/dashboard/schemas/transaction";

const API_URL = "http://localhost:8000/"; // adjust if your FastAPI server runs on a different port

export async function fetchTransactions(): Promise<ReadTransaction[]> {
  const res = await fetch(`${API_URL}/transactions`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}