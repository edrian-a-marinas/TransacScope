import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";

import {
  ReadUsers,
  PromoteUser,
  DeleteUser,
  RestoreUser,
  UserDetails,
  HandleDeletionRequest
} from "../components";

export default function ManageUsersPage() {
  const { user } = useContext(AuthContext);

  const userRole = user!.role_id;
  const userID = user!.id;

  const [showReadModal, setShowReadModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
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
        {userID === 1 && (
          <>
            <li>
              <button onClick={() => setShowPromoteModal(true)}>
                Promote / Demote User
              </button>
            </li>

            <li>
              <button onClick={() => setShowDeleteModal(true)}>
                Soft Delete User
              </button>
            </li>

            <li>
              <button onClick={() => setShowRestoreModal(true)}>
                Restore User
              </button>
            </li>
          </>
        )}

        {/* Admin + Super Admin */}
        {(userRole === 1 || userRole === 2) && (
          <li>
            <button onClick={() => setShowHandleRequestModal(true)}>
              Handle Deletion Requests
            </button>
          </li>
        )}

        <li>
          <button onClick={() => setShowDetailsModal(true)}>
            View User Details
          </button>
        </li>
      </ul>

      {showReadModal && (
        <ReadUsers onClose={() => setShowReadModal(false)} />
      )}

      {showPromoteModal && (
        <PromoteUser onClose={() => setShowPromoteModal(false)} />
      )}

      {showDeleteModal && (
        <DeleteUser onClose={() => setShowDeleteModal(false)} />
      )}

      {showRestoreModal && (
        <RestoreUser onClose={() => setShowRestoreModal(false)} />
      )}

      {showDetailsModal && (
        <UserDetails onClose={() => setShowDetailsModal(false)} />
      )}

      {showHandleRequestModal && (
        <HandleDeletionRequest onClose={() => setShowHandleRequestModal(false)} />
      )}
    </div>
  );
}