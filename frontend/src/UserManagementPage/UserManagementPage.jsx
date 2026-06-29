import React, { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  Pencil,
  X,
  ShieldAlert,
  AlertTriangle,
  Users,
  Shield,
  Lock,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import { userApi } from "../api/userApi";

function UserManagementPage() {
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeNow: 0,
    staffMembers: 0,
    lockedAccounts: 0,
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedStatus, setSelectedStatus] = useState("Any Status");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("PARKING STAFF");

  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [updatedRole, setUpdatedRole] = useState("");

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [userToLock, setUserToLock] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const formatRoleLabel = (roleName) => {
    if (roleName === "SYSTEM_ADMIN") return "ADMIN";
    if (roleName === "PARKING_MANAGER") return "PARKING MANAGEMENT";
    if (roleName === "PARKING_STAFF") return "PARKING STAFF";
    if (roleName === "DRIVER") return "USER";

    return roleName || "USER";
  };

  const getRoleIdByLabel = (roleLabel) => {
    if (roleLabel === "ADMIN") return 1;
    if (roleLabel === "PARKING MANAGEMENT") return 2;
    if (roleLabel === "PARKING STAFF") return 3;
    if (roleLabel === "USER") return 4;

    return 4;
  };

  const formatStatusLabel = (user) => {
    if (user.status === "BANNED") return "Locked";
    if (user.online) return "Active";

    return "Offline";
  };

  const getAvatarText = (fullName) => {
    if (!fullName) return "U";

    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const formatLastLogin = (value) => {
    if (!value) return "Never";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Never";
    }

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const mapApiUserToTableUser = (user) => {
    return {
      id: user.id,
      displayId: `USR-${String(user.id).padStart(4, "0")}`,
      name: user.fullName,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId,
      roleName: user.roleName,
      roles: [formatRoleLabel(user.roleName)],
      accountStatus: user.status,
      status: formatStatusLabel(user),
      online: user.online,
      lastLogin: formatLastLogin(user.lastLoginAt),
      avatar: getAvatarText(user.fullName),
    };
  };

  const calculateStats = (mappedUsers) => {
    const staffRoles = ["ADMIN", "PARKING MANAGEMENT", "PARKING STAFF"];

    return {
      totalAccounts: mappedUsers.length,
      activeNow: mappedUsers.filter((user) => user.online).length,
      staffMembers: mappedUsers.filter((user) =>
        user.roles.some((role) => staffRoles.includes(role))
      ).length,
      lockedAccounts: mappedUsers.filter(
        (user) => user.accountStatus === "BANNED"
      ).length,
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await userApi.getUsers();
      const apiUsers = Array.isArray(res.data) ? res.data : [];
      const mappedUsers = apiUsers.map(mapApiUserToTableUser);

      setUsers(mappedUsers);
      setStats(calculateStats(mappedUsers));
    } catch (error) {
      console.error("Lỗi kết nối API users:", error);

      setUsers([]);
      setStats({
        totalAccounts: 0,
        activeNow: 0,
        staffMembers: 0,
        lockedAccounts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const openEditRoleModal = (user) => {
    setEditingUser(user);
    setUpdatedRole(user.roles[0] || "USER");
    setIsEditRoleOpen(true);
  };

  const handleUpdateRoleSubmit = async (e) => {
    e.preventDefault();

    if (!editingUser) return;

    try {
      const roleId = getRoleIdByLabel(updatedRole);

      await userApi.updateUserRole(editingUser.id, {
        roleId,
      });

      setIsEditRoleOpen(false);
      setEditingUser(null);

      await fetchData();
    } catch (error) {
      console.error("Lỗi khi cập nhật quyền hạn:", error);
      alert(error.response?.data?.message || "Không thể cập nhật role");
    }
  };

  const triggerLockConfirmation = (user) => {
    setUserToLock(user);
    setIsLockModalOpen(true);
  };

  const handleConfirmLockUser = async () => {
    if (!userToLock) return;

    const isCurrentlyLocked = userToLock.status === "Locked";
    const nextStatus = isCurrentlyLocked ? "ACTIVE" : "BANNED";

    try {
      await userApi.updateUserStatus(userToLock.id, {
        status: nextStatus,
      });

      setIsLockModalOpen(false);
      setUserToLock(null);

      await fetchData();
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái tài khoản:", error);
      alert(
        error.response?.data?.message ||
          "Không thể cập nhật trạng thái tài khoản"
      );
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();

    if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      alert("Please fill full name, email and password");
      return;
    }

    try {
      await userApi.createUser({
        fullName: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        password: newPassword,
        roleId: getRoleIdByLabel(newRole),
      });

      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("");
      setNewRole("PARKING STAFF");
      setIsModalOpen(false);

      await fetchData();
    } catch (error) {
      console.error("Lỗi thêm tài khoản mới:", error);
      alert(error.response?.data?.message || "Không thể thêm tài khoản mới");
    }
  };

  const filteredUsers = users.filter((user) => {
    const keyword = searchTerm.toLowerCase();

    const matchesSearch =
      String(user.name || "").toLowerCase().includes(keyword) ||
      String(user.email || "").toLowerCase().includes(keyword) ||
      String(user.displayId || "").toLowerCase().includes(keyword) ||
      String(user.id || "").toLowerCase().includes(keyword);

    const matchesRole =
      selectedRole === "All Roles" || user.roles.includes(selectedRole);

    const matchesStatus =
      selectedStatus === "Any Status" || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div
      className="dashboard-layout"
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Sidebar />

      <main
        className="main-content"
        style={{
          flexGrow: 1,
          padding: "1.5rem 2rem",
          height: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          overflow: "hidden",
        }}
      >
        <Header />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: "700",
                margin: 0,
                color: "#fff",
              }}
            >
              User Management
            </h1>

            <p
              style={{
                color: "#64748b",
                fontSize: "0.85rem",
                marginTop: "4px",
              }}
            >
              Configure access levels and manage system operators.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "#3b82f6",
              color: "#fff",
              border: "none",
              padding: "0.6rem 1.2rem",
              borderRadius: "0.5rem",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <UserPlus size={16} /> Add user
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              backgroundColor: "#111827",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#64748b",
                fontSize: "0.65rem",
                fontWeight: "700",
                letterSpacing: "0.05em",
              }}
            >
              <span>TOTAL ACCOUNTS</span>
              <Users size={16} style={{ color: "#3b82f6" }} />
            </div>

            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: "700",
                margin: "0.25rem 0 0 0",
                color: "#fff",
              }}
            >
              {stats.totalAccounts.toLocaleString()}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "#111827",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#64748b",
                fontSize: "0.65rem",
                fontWeight: "700",
                letterSpacing: "0.05em",
              }}
            >
              <span>ACTIVE NOW</span>
              <UserCheck size={16} style={{ color: "#10b981" }} />
            </div>

            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: "700",
                margin: "0.25rem 0 0 0",
                color: "#fff",
              }}
            >
              {stats.activeNow.toLocaleString()}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "#111827",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#64748b",
                fontSize: "0.65rem",
                fontWeight: "700",
                letterSpacing: "0.05em",
              }}
            >
              <span>STAFF MEMBERS</span>
              <Shield size={16} style={{ color: "#6366f1" }} />
            </div>

            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: "700",
                margin: "0.25rem 0 0 0",
                color: "#fff",
              }}
            >
              {stats.staffMembers}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "#111827",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#ef4444",
                fontSize: "0.65rem",
                fontWeight: "700",
                letterSpacing: "0.05em",
              }}
            >
              <span>LOCKED ACCOUNTS</span>
              <Lock size={16} style={{ color: "#ef4444" }} />
            </div>

            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: "700",
                margin: "0.25rem 0 0 0",
                color: "#ef4444",
              }}
            >
              {stats.lockedAccounts.toString().padStart(2, "0")}
            </h2>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ position: "relative", flexGrow: 1 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#475569",
              }}
            />

            <input
              type="text"
              placeholder="Filter by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                backgroundColor: "#111827",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                padding: "0.5rem 1rem 0.5rem 2.2rem",
                color: "#fff",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              backgroundColor: "#111827",
              color: "#fff",
              border: "1px solid #1e293b",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option>All Roles</option>
            <option>ADMIN</option>
            <option>PARKING MANAGEMENT</option>
            <option>PARKING STAFF</option>
            <option>USER</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              backgroundColor: "#111827",
              color: "#fff",
              border: "1px solid #1e293b",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option>Any Status</option>
            <option>Active</option>
            <option>Offline</option>
            <option>Locked</option>
          </select>
        </div>

        <div
          style={{
            backgroundColor: "#111827",
            borderRadius: "0.75rem",
            border: "1px solid #1e293b",
            overflow: "hidden",
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {loading ? (
            <div
              style={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#64748b",
                fontSize: "0.9rem",
              }}
            >
              Synchronizing infrastructure data...
            </div>
          ) : (
            <div style={{ flexGrow: 1, overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "0.85rem",
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#111827",
                    zIndex: 1,
                  }}
                >
                  <tr
                    style={{
                      borderBottom: "1px solid #1e293b",
                      color: "#64748b",
                    }}
                  >
                    <th style={{ padding: "0.85rem 1rem" }}>User ID</th>
                    <th style={{ padding: "0.85rem 1rem" }}>Full name</th>
                    <th style={{ padding: "0.85rem 1rem" }}>Email</th>
                    <th style={{ padding: "0.85rem 1rem" }}>Role</th>
                    <th style={{ padding: "0.85rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.85rem 1rem" }}>Last login</th>
                    <th
                      style={{
                        padding: "0.85rem 1rem",
                        textAlign: "right",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.map((user) => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.02)",
                        color: "#cbd5e1",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          color: "#64748b",
                        }}
                      >
                        {user.displayId}
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              backgroundColor: "#1e293b",
                              border: "1px solid #3b82f6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              color: "#3b82f6",
                            }}
                          >
                            {user.avatar}
                          </div>

                          <span
                            style={{
                              fontWeight: "600",
                              color: "#fff",
                            }}
                          >
                            {user.name}
                          </span>
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          color: "#94a3b8",
                        }}
                      >
                        {user.email}
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {user.roles.map((role, index) => (
                            <span
                              key={index}
                              style={{
                                backgroundColor: "#1e293b",
                                color: "#93c5fd",
                                fontSize: "0.65rem",
                                fontWeight: "700",
                                padding: "0.15rem 0.4rem",
                                borderRadius: "0.25rem",
                              }}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          <div
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor:
                                user.status === "Active"
                                  ? "#10b981"
                                  : user.status === "Locked"
                                  ? "#ef4444"
                                  : "#64748b",
                            }}
                          />

                          <span
                            style={{
                              color:
                                user.status === "Active"
                                  ? "#10b981"
                                  : user.status === "Locked"
                                  ? "#ef4444"
                                  : "#64748b",
                              fontWeight: "500",
                            }}
                          >
                            {user.status}
                          </span>
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          color: "#64748b",
                        }}
                      >
                        {user.lastLogin}
                      </td>

                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "0.75rem",
                          }}
                        >
                          <button
                            onClick={() => openEditRoleModal(user)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#94a3b8",
                              cursor: "pointer",
                            }}
                            title="Edit Role"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={() => triggerLockConfirmation(user)}
                            style={{
                              background: "none",
                              border: "none",
                              color:
                                user.status === "Locked"
                                  ? "#ef4444"
                                  : "#94a3b8",
                              cursor: "pointer",
                            }}
                            title={
                              user.status === "Locked"
                                ? "Unlock Account"
                                : "Lock Account"
                            }
                          >
                            <Lock size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
              borderTop: "1px solid #1e293b",
              color: "#64748b",
              fontSize: "0.8rem",
              backgroundColor: "#111827",
              flexShrink: 0,
            }}
          >
            <span>
              Showing{" "}
              <b>{filteredUsers.length > 0 ? indexOfFirstItem + 1 : 0}</b> -{" "}
              <b>{Math.min(indexOfLastItem, filteredUsers.length)}</b> of{" "}
              <b>{filteredUsers.length}</b> users
            </span>

            <div
              style={{
                display: "flex",
                gap: "0.35rem",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #1e293b",
                  color: currentPage === 1 ? "#475569" : "#94a3b8",
                  width: "32px",
                  height: "32px",
                  borderRadius: "0.375rem",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronLeft size={14} />
              </button>

              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => setCurrentPage(number)}
                  style={{
                    backgroundColor:
                      currentPage === number ? "#3b82f6" : "#1e293b",
                    border: "1px solid #1e293b",
                    color: currentPage === number ? "#fff" : "#94a3b8",
                    width: "32px",
                    height: "32px",
                    borderRadius: "0.375rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {number}
                </button>
              ))}

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                style={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #1e293b",
                  color: currentPage === totalPages ? "#475569" : "#94a3b8",
                  width: "32px",
                  height: "32px",
                  borderRadius: "0.375rem",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(3, 7, 18, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#111827",
              border: "1px solid #1e293b",
              width: "460px",
              borderRadius: "0.75rem",
              padding: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                }}
              >
                Provision New Account
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAddUserSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  FULL NAME
                </label>

                <input
                  type="text"
                  required
                  placeholder="Nguyen Van A"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0b0f19",
                    border: "1px solid #1e293b",
                    borderRadius: "0.375rem",
                    padding: "0.6rem 0.75rem",
                    color: "#fff",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  EMAIL ADDRESS
                </label>

                <input
                  type="email"
                  required
                  placeholder="staff@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0b0f19",
                    border: "1px solid #1e293b",
                    borderRadius: "0.375rem",
                    padding: "0.6rem 0.75rem",
                    color: "#fff",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  PHONE
                </label>

                <input
                  type="text"
                  placeholder="0900000000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0b0f19",
                    border: "1px solid #1e293b",
                    borderRadius: "0.375rem",
                    padding: "0.6rem 0.75rem",
                    color: "#fff",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  PASSWORD
                </label>

                <input
                  type="password"
                  required
                  placeholder="Password@123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0b0f19",
                    border: "1px solid #1e293b",
                    borderRadius: "0.375rem",
                    padding: "0.6rem 0.75rem",
                    color: "#fff",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  ASSIGN ROLE
                </label>

                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#0b0f19",
                    border: "1px solid #1e293b",
                    borderRadius: "0.375rem",
                    padding: "0.6rem 0.75rem",
                    color: "#fff",
                    fontSize: "0.85rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="PARKING MANAGEMENT">PARKING MANAGEMENT</option>
                  <option value="PARKING STAFF">PARKING STAFF</option>
                  <option value="USER">USER</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #1e293b",
                    color: "#94a3b8",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    backgroundColor: "#3b82f6",
                    border: "none",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditRoleOpen && editingUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(3, 7, 18, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#111827",
              border: "1px solid #1e293b",
              width: "420px",
              borderRadius: "0.75rem",
              padding: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#3b82f6",
                }}
              >
                <ShieldAlert size={18} />

                <h3
                  style={{
                    margin: 0,
                    color: "#fff",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                  }}
                >
                  Modify User Role
                </h3>
              </div>

              <button
                onClick={() => setIsEditRoleOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#0b0f19",
                padding: "0.75rem",
                borderRadius: "0.375rem",
                marginBottom: "1.25rem",
                border: "1px solid rgba(255,255,255,0.02)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                Selected Operator:
              </p>

              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "0.9rem",
                  color: "#fff",
                  fontWeight: "600",
                }}
              >
                {editingUser.name}
              </p>

              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                }}
              >
                {editingUser.email}
              </p>
            </div>

            <form
              onSubmit={handleUpdateRoleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  SELECT SYSTEM SECURITY LEVEL
                </label>

                <select
                  value={updatedRole}
                  onChange={(e) => setUpdatedRole(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#0b0f19",
                    border: "1px solid #1e293b",
                    borderRadius: "0.375rem",
                    padding: "0.6rem 0.75rem",
                    color: "#fff",
                    fontSize: "0.85rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="PARKING MANAGEMENT">PARKING MANAGEMENT</option>
                  <option value="PARKING STAFF">PARKING STAFF</option>
                  <option value="USER">USER</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditRoleOpen(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #1e293b",
                    color: "#94a3b8",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    backgroundColor: "#3b82f6",
                    border: "none",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLockModalOpen && userToLock && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(3, 7, 18, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#111827",
              border: "1px solid #1e293b",
              width: "440px",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  backgroundColor:
                    userToLock.status === "Locked"
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                  color: userToLock.status === "Locked" ? "#10b981" : "#ef4444",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>

              <div style={{ flexGrow: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    color: "#fff",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                  }}
                >
                  {userToLock.status === "Locked"
                    ? "Unlock Account"
                    : "Lock Account"}
                </h3>

                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "#64748b",
                    fontSize: "0.85rem",
                    lineHeight: "1.4",
                  }}
                >
                  {userToLock.status === "Locked"
                    ? "Are you sure you want to unlock this account?"
                    : "Are you sure you want to lock this account?"}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsLockModalOpen(false);
                  setUserToLock(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#475569",
                  cursor: "pointer",
                  marginTop: "2px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#0b0f19",
                padding: "0.85rem",
                borderRadius: "0.5rem",
                marginBottom: "1.5rem",
                border: "1px solid #1e293b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "#cbd5e1",
                    }}
                  >
                    {userToLock.name}
                  </span>

                  <span
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    {userToLock.email}
                  </span>
                </div>

                <span
                  style={{
                    backgroundColor:
                      userToLock.status === "Locked"
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                    color:
                      userToLock.status === "Locked" ? "#10b981" : "#ef4444",
                    fontSize: "0.65rem",
                    fontWeight: "700",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  {userToLock.displayId}
                </span>
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  marginTop: "0.75rem",
                  paddingTop: "0.5rem",
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                }}
              >
                {userToLock.status === "Locked"
                  ? "Warning: This user will be able to log in again after unlocking."
                  : "Warning: This user will not be able to log in until the account is unlocked."}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsLockModalOpen(false);
                  setUserToLock(null);
                }}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #1e293b",
                  color: "#94a3b8",
                  padding: "0.55rem 1.2rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLockUser}
                style={{
                  backgroundColor:
                    userToLock.status === "Locked" ? "#10b981" : "#ef4444",
                  border: "none",
                  color: "#fff",
                  padding: "0.55rem 1.2rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {userToLock.status === "Locked"
                  ? "Confirm Unlock"
                  : "Confirm Lock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementPage;