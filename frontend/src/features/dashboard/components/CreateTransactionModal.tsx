import { useState, useEffect, useContext } from "react";
import type { ChangeEvent } from "react";

import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { Transaction, Category } from "../schemas/transaction";
import { transactionSchema } from "../schemas/transaction";
import type { OnCloseProps } from "../../../../utility";

export default function CreateTransaction({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [categoryDescription, setCategoryDescription] = useState("");

  const [form, setForm] = useState<Transaction>({
    amount: 0,
    description: "",
    category_id: 0,
    transaction_type: "",
    transaction_date: ""
  });

  const [amountInput, setAmountInput] = useState("");

  // 🔹 Fetch categories when type changes
  useEffect(() => {
    if (!form.transaction_type) {
      setCategories([]);
      return;
    }

    const endpoint =
      form.transaction_type === "Expense"
        ? "api/categories/expense"
        : "api/categories/income";

    api.get(endpoint).then(res => {
      setCategories(res.data);
      setForm(prev => ({ ...prev, category_id: 0 }));
    });
  }, [form.transaction_type]);

  // 🔹 Update selected category label
  useEffect(() => {
    const selected = categories.find(c => c.id === form.category_id);
    setCategoryDescription(selected ? selected.name : "");
  }, [form.category_id, categories]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]:
        name === "category_id" ? Number(value) : value
    }));
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (!/^\d*\.?\d*$/.test(value)) return;

    const parts = value.split(".");
    if (parts[1]?.length > 2) {
      parts[1] = parts[1].slice(0, 2);
    }

    setAmountInput(parts.join("."));
  };

  const handleSubmit = () => {
    const updatedForm = {
      ...form,
      amount: Number(amountInput)
    };

    const result = transactionSchema.safeParse(updatedForm);

    if (!result.success) {
      setErrors(result.error.issues.map(issue => issue.message));
      return;
    }

    setErrors([]);
    setForm(updatedForm);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      if (!user) return;
      if (!token || !tokenType) return alert("Not authorized");

      await api.post("api/transactions/", form, {
        headers: {
          Authorization: `${tokenType} ${token}`
        }
      });

      alert("Successfully created!");

      setForm({
        amount: 0,
        description: "",
        category_id: 0,
        transaction_type: "",
        transaction_date: ""
      });

      setAmountInput("");
      setShowConfirmation(false);
      onClose();
    } catch (err: any) {
      console.error(err.res?.data);
    }
  };

  const handleBackToEdit = () => {
    setShowConfirmation(false);
  }  

  return (
    <>
      {!showConfirmation && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#1c1414",
              padding: "1.5rem",
              borderRadius: "8px",
              minWidth: "320px",
              position: "relative"
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "8px",
                right: "12px",
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: "22px",
                cursor: "pointer"
              }}
            >
              ×
            </button>

            <h2 style={{ textAlign: "center" }}>Add Transaction</h2>

            {errors.length > 0 && (
              <div style={{ color: "red" }}>
                {errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              {/* Type */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ width: "40%" }}>Type</label>
                <select
                  name="transaction_type"
                  value={form.transaction_type}
                  onChange={handleChange}
                  style={{ width: "57%" }}
                >
                  <option value="">Select Type</option>
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                </select>
              </div>

              {/* Category */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ width: "40%" }}>Category</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  disabled={!form.transaction_type}
                  style={{ width: "57%" }}
                >
                  <option value={0}>Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ width: "40%" }}>Date</label>
                <input
                  type="date"
                  name="transaction_date"
                  value={form.transaction_date}
                  onChange={handleChange}
                  style={{ width: "55%" }}
                />
              </div>

              {/* Amount */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ width: "40%" }}>Amount</label>
                <input
                  type="text"
                  value={amountInput}
                  onChange={handleAmountChange}
                  placeholder="₱ Enter amount"
                  style={{ width: "55%" }}
                />
              </div>

              {/* Description */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ width: "40%" }}>Description</label>
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  style={{ width: "55%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button onClick={onClose}>Cancel</button>
                <button onClick={handleSubmit}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div
          onClick={handleBackToEdit}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#1c1414",
              padding: "1.5rem",
              borderRadius: "8px",
              minWidth: "320px"
            }}
          >
            <h2> Confirm Transaction Details </h2>
            <h3 style={{ textAlign: "center" }}>
              Type: {form.transaction_type}
            </h3>

            <p><strong>Category:</strong> {categoryDescription}</p>
            <p><strong>Date:</strong> {form.transaction_date}</p>
            <p><strong>Amount:</strong> ₱{Number(form.amount).toLocaleString()}</p>
            <p><strong>Description:</strong> {form.description}</p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={handleBackToEdit}>Go Back</button>
              <button onClick={handleConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}