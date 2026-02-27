import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";

import {
  ReadUsers,
  PromoteUser,
  UserDetails,
  HandleDeletionRequest
} from "../components";

export default function ManageUsersPage() {
  const { user } = useContext(AuthContext);

  const userRole = user!.role_id;
  const userID = user!.id;

  const [showReadModal, setShowReadModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHandleRequestModal, setShowHandleRequestModal] = useState(false);

  return (
    <div>
      <title>Manage Users</title>
      <h1>Manage Users</h1>

      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>
          <button onClick={() => setShowReadModal(true)}>
            View Users
          </button>
        </li>

        {/* Super Admin Only */}
        {(userID === 1 && userRole === 1) && (
          <>
            <li>
              <button onClick={() => setShowPromoteModal(true)}>
                Promote / Demote User
              </button>
            </li>
          </>
        )}

        {/* Admin + Super Admin */}
        {(userRole === 1 || userRole === 2) && (
          <li>
            <button onClick={() => setShowHandleRequestModal(true)}>
              Handle Transaction Deletion Requests
            </button>
          </li>
        )}

        <li>
          <button onClick={() => setShowDetailsModal(true)}>
            View User Details  {/* Admin + Super Admin  Put the FOR SUPER ADMIN only soft and restore account here. */}
          </button> 
        </li>
      </ul>

      {showReadModal && (<ReadUsers onClose={() => setShowReadModal(false)} />)}
      {showPromoteModal && (<PromoteUser onClose={() => setShowPromoteModal(false)} />)}
      {showDetailsModal && (<UserDetails onClose={() => setShowDetailsModal(false)} />)}
      {showHandleRequestModal && (<HandleDeletionRequest onClose={() => setShowHandleRequestModal(false)} />)}

    </div>
  );
}