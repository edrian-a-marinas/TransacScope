import { useEffect, useState, useContext } from "react";
import type { ChangeEvent } from "react"
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { CategoryCreate, CategoryRead } from "../schemas/category";
import { categorySchema } from "../schemas/category";
import type { OnCloseProps } from "../../../../utility";

type ModalStep = "list" | "add" | "confirmAdd" | "edit" | "deleteConfirm";

export default function ManageCategories({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;


  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [categories, setCategories] = useState<CategoryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ModalStep>("list");
  const [selectedCategory, setSelectedCategory] = useState<CategoryRead | null>(null);
  const [formData, setFormData] = useState<CategoryCreate>({ name: "", description: "", type: "" as any });
  const [errors, setErrors] = useState<string[]>([]);

  // fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!token || !tokenType) return;
      try {
        const res = await api.get("api/categories/", { headers: { Authorization: `${tokenType} ${token}` } });
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [token, tokenType]);

  // --- Handlers ---
  const handleOpenAdd = () => {
    setFormData({ name: "", description: "", type: "" as any });
    setErrors([]);
    setStep("add");
  };

  const handleOpenEdit = (cat: CategoryRead) => {
    setSelectedCategory(cat);
    setFormData({ name: cat.name, description: cat.description || "", type: cat.type });
    setErrors([]);
    setStep("edit");
  };

  const handleOpenDelete = (cat: CategoryRead) => {
    setSelectedCategory(cat);
    setStep("deleteConfirm");
  };

  const handleAddNext = () => {
    if (!user || userRole !== 1) return alert("Not authorized"); // allow only admin
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
      const res = await api.post("api/categories/", formData, { headers: { Authorization: `${tokenType} ${token}` } });
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
    try {
      await api.delete(`api/categories/${selectedCategory.id}`, { headers: { Authorization: `${tokenType} ${token}` } });
      setCategories(categories.filter(c => c.id !== selectedCategory.id));
      setStep("list");
      setSelectedCategory(null);
      alert("DELETED A CATEGORY! ")
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


  const [showEditConfirmation, setShowEditConfirmation] = useState(false);


  const handleConfirmEdit = async () => {
    if (!selectedCategory || !user || userRole !== 1) return alert("Not authorized");
    try {
      const parsed = categorySchema.parse(formData);
      await api.put(`api/categories/${selectedCategory.id}`, parsed, { headers: { Authorization: `${tokenType} ${token}` } });
      setCategories(categories.map(c => (c.id === selectedCategory.id ? { ...c, ...parsed } : c)));
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

  // --- Render ---
  return (
    <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1c1414", padding: "1.5rem", borderRadius: "8px", minWidth: "500px", maxHeight: "80vh", overflow: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "8px", right: "12px", background: "transparent", border: "none", color: "#aaa", fontSize: "22px", cursor: "pointer" }}>×</button>

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
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
              </select>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={handleBack}>Back</button>

                {/* Add: go to confirm step; Edit: go to confirm modal */}
                {step === "add" ? (
                  <button onClick={handleAddNext}>Next</button>
                ) : (
                  <button onClick={() => setShowEditConfirmation(true)}>Next</button>
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

        {step === "deleteConfirm" && selectedCategory && (
          <>
            <h2 style={{ textAlign: "center" }}>Delete Category</h2>
            <p>Are you sure you want to delete <strong>{selectedCategory.name}</strong>?</p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={handleBack}>Cancel</button>
              <button onClick={handleDelete}>Delete</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { border: "1px solid #999", padding: "4px 8px", backgroundColor: "#333", color: "#fff" };
const tdStyle: React.CSSProperties = { border: "1px solid #999", padding: "4px 8px", color: "#eee" };