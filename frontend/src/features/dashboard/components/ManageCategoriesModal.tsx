import { useEffect, useState, useContext } from "react";
import type { ChangeEvent } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { CategoryCreate, CategoryRead, ModalStep } from "../schemas/category";
import { categorySchema } from "../schemas/category";
import type { OnCloseProps } from "../../../../utility";
import { useOutsideClickStrict } from "../../../../utilityHooks";

export default function ManageCategories({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [transactionUsageCount, setTransactionUsageCount] = useState<number | null>(null);
  const [showUsageCheck, setShowUsageCheck] = useState(false);

  const [categories, setCategories] = useState<CategoryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ModalStep>("list");
  const [selectedCategory, setSelectedCategory] = useState<CategoryRead | null>(null);
  const [formData, setFormData] = useState<CategoryCreate>({ name: "", description: "", type: "" as any });
  const [errors, setErrors] = useState<string[]>([]);
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!token || !tokenType) return;
      try {
        const res = await api.get("api/categories/", {
          headers: { Authorization: `${tokenType} ${token}` }
        });
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [token, tokenType]);

  const handleOpenAdd = () => {
    setFormData({ name: "", description: "", type: "" as any });
    setErrors([]);
    setStep("add");
  };

  const handleOpenEdit = (cat: CategoryRead) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || "",
      type: cat.type
    });
    setErrors([]);
    setStep("edit");
  };

  const handleOpenDelete = (cat: CategoryRead) => {
    setSelectedCategory(cat);
    setStep("deleteConfirm");
  };

  const handleAddNext = () => {
    if (!user || userRole !== 1) return alert("Not authorized");

    const result = categorySchema.safeParse(formData);
    if (!result.success) {
      setErrors(result.error.issues.map(i => i.message));
      return;
    }

    setErrors([]);
    setStep("confirmAdd");
  };

  const handleConfirmAdd = async () => {
    if (!user || userRole !== 1) return alert("Not authorized");

    try {
      const res = await api.post("api/categories/", formData, {
        headers: { Authorization: `${tokenType} ${token}` }
      });

      setCategories([...categories, res.data]);
      alert("Category successfully added!");
      setStep("list");
      setFormData({ name: "", description: "", type: "" as any });
    } catch (err: any) {
      console.error(err);
      setErrors([err?.response?.data?.message || "Failed to add category"]);
      setStep("add");
    }
  };

  const handleDelete = async () => {
    if (!user || userRole !== 1) return alert("Not authorized");
    if (!selectedCategory) return;

    setDeleteLoading(true);

    try {
      // Fetch how many transactions use this category
      const res = await api.get(
        `api/transactions/count-by-category/${selectedCategory.id}`,
        {
          headers: { Authorization: `${tokenType} ${token}` }
        }
      );

      setTransactionUsageCount(res.data.count);
      setShowUsageCheck(true);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFinalDelete = async () => {
    if (!selectedCategory || !user || userRole !== 1) return;

    try {
      await api.delete(`api/categories/${selectedCategory.id}`, {
        headers: { Authorization: `${tokenType} ${token}` }
      });

      setCategories(categories.filter(c => c.id !== selectedCategory.id));
      setStep("list");
      setSelectedCategory(null);
      setTransactionUsageCount(null);
      setShowUsageCheck(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBack = () => {
    setStep("list");
    setSelectedCategory(null);
    setErrors([]);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmEdit = async () => {
    if (!selectedCategory || !user || userRole !== 1) return alert("Not authorized");

    try {
      const parsed = categorySchema.parse(formData);

      await api.put(`api/categories/${selectedCategory.id}`, parsed, {
        headers: { Authorization: `${tokenType} ${token}` }
      });

      setCategories(
        categories.map(c =>
          c.id === selectedCategory.id ? { ...c, ...parsed } : c
        )
      );

      setStep("list");
      setSelectedCategory(null);
      setShowEditConfirmation(false);
      alert("Successfully updated category!");
    } catch (err: any) {
      setErrors(err?.message ? [err.message] : ["Validation error"]);
      setShowEditConfirmation(false);
    }
  };

  const handleBackToEditForm = () => {
    setShowEditConfirmation(false);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
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
        style={{
          background: "#1c1414",
          padding: "1.5rem",
          borderRadius: "8px",
          minWidth: "500px",
          maxHeight: "80vh",
          overflow: "auto",
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

        {step === "list" && (
          <>
            <h2 style={{ textAlign: "center" }}>Manage Categories</h2>
            {userRole === 1 && <button onClick={handleOpenAdd}>Add Category</button>}
            {loading && <p>Loading...</p>}
            {!loading && categories.length === 0 && <p>No categories found.</p>}
            {!loading && categories.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Type</th>
                    {userRole === 1 && <th style={thStyle}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td style={tdStyle}>{cat.name}</td>
                      <td style={tdStyle}>{cat.description}</td>
                      <td style={tdStyle}>{cat.type}</td>
                      {userRole === 1 && (
                        <td style={tdStyle}>
                          <button onClick={() => handleOpenEdit(cat)}>Edit</button>
                          <button onClick={() => handleOpenDelete(cat)} style={{ marginLeft: "0.5rem" }}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {(step === "add" || step === "edit") && (
          <>
            <h2 style={{ textAlign: "center" }}>{step === "add" ? "Add Category" : "Edit Category"}</h2>

            {errors.length > 0 && (
              <div style={{ color: "red" }}>
                {errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
              />
              <input
                type="text"
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleChange}
              />
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="">Select Type</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={handleBack}>Back</button>

                {/* Add: go to confirm step; Edit: go to confirm modal */}
                {step === "add" ? (
                  <button onClick={handleAddNext}>Add Category</button>
                ) : (
                  <button onClick={() => setShowEditConfirmation(true)}>Edit</button>
                )}
              </div>
            </div>
          </>
        )}

        {showEditConfirmation && selectedCategory && (
          <div
            onClick={handleBackToEditForm}
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
              style={{ background: "#1c1414", padding: "1.5rem", borderRadius: "8px", minWidth: "320px", position: "relative" }}
            >
              <h2 style={{ textAlign: "center" }}>Confirm Edit Category</h2>
              <div>
                <h3>Before:</h3>
                <p><strong>Name:</strong> {selectedCategory.name}</p>
                <p><strong>Description:</strong> {selectedCategory.description}</p>
                <p><strong>Type:</strong> {selectedCategory.type}</p>

                <h3>After:</h3>
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Description:</strong> {formData.description}</p>
                <p><strong>Type:</strong> {formData.type}</p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button onClick={handleBackToEditForm}>Go Back</button>
                <button onClick={handleConfirmEdit}>Confirm Update</button>
              </div>
            </div>
          </div>
        )}

        {step === "confirmAdd" && (
          <>
            <h2 style={{ textAlign: "center" }}>Confirm Add Category</h2>
            <p><strong>Name:</strong> {formData.name}</p>
            <p><strong>Description:</strong> {formData.description}</p>
            <p><strong>Type:</strong> {formData.type}</p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep("add")}>Back</button>
              <button onClick={handleConfirmAdd}>Confirm</button>
            </div>
          </>
        )}

        {step === "deleteConfirm" && selectedCategory && !showUsageCheck && (
          <>
            <h2 style={{ textAlign: "center" }}>Delete Category</h2>
            <p>Are you sure you want to delete this category?</p>
            <div style={{ marginBottom: "1rem" }}>
              <p><strong>Category Name:</strong> {selectedCategory.name}</p>
              <p><strong>Description:</strong> {selectedCategory.description || "No description available"}</p>
              <p><strong>Type:</strong> {selectedCategory.type}</p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={handleBack}>Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? "Checking..." : "Delete"}
              </button>
            </div>
          </>
        )}


        {step === "deleteConfirm" && selectedCategory && showUsageCheck && (
          <>
            <h2 style={{ textAlign: "center" }}>Delete Category</h2>

            {transactionUsageCount && transactionUsageCount > 0 ? (
              <p style={{ color: "red", fontWeight: "bold" }}>
                WARNING: This category is used by {transactionUsageCount} transactions.
                <br />
                (Transactions will NOT be deleted. Only the category.)
              </p>
            ) : (
              <p style={{ color: "lightgreen", fontWeight: "bold" }}>
                This category is not used by any transactions. Safe to delete.
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
              <button onClick={handleBack}>Cancel</button>
              <button onClick={handleFinalDelete}>Delete</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 8px",
  backgroundColor: "#333",
  color: "#fff"
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 8px",
  color: "#eee"
};