import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";

import {
  ExpenseReportModal
  //IncomeReportModal,
  //CombinedReportModal,
} from "../components";

export default function ReportsPage() {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseReport, setShowExpenseReport] = useState(false);
  const [showCombinedModal, setShowCombinedModal] = useState(false);

  return (
    <div>
      <title>Reports</title>
      <h1>Reports</h1>

      <h3>
        {userRole === 1
          ? "Admin Report (All Users)"
          : "Your Personal Report"}
      </h3>

      <button onClick={() => setShowIncomeModal(true)}>Income Report</button>
      <button onClick={() => setShowExpenseReport(true)}>Expense Report</button>
      <button onClick={() => setShowCombinedModal(true)}>Combined Report</button>
        
      {/* showIncomeModal && <IncomeReportModal onClose={() => setShowIncomeModal(false)} /> */}
      {showExpenseReport && <ExpenseReportModal onClose={() => setShowExpenseReport(false)} />}
      {/* showCombinedModal && <CombinedReportModal onClose={() => setShowCombinedModal(false)} />*/}
    </div>
  );
}