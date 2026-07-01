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

const theme = {
  page: "var(--bg-dashboard)",
  card: "var(--bg-card)",
  cardSoft: "var(--bg-card-soft)",
  input: "var(--bg-input)",
  border: "var(--border-color)",
  tableHeader: "var(--bg-table-header)",
  tableRow: "var(--bg-table-row)",
  text: "var(--text-main)",
  muted: "var(--text-muted)",
  blue: "var(--primary-blue)",
  blueSoft: "var(--primary-blue-soft)",
  green: "var(--success-green)",
  greenSoft: "var(--success-green-soft)",
  red: "var(--danger-red)",
  redSoft: "var(--danger-red-soft)",
  yellow: "var(--warning-yellow)",
  yellowSoft: "var(--warning-yellow-soft)",
  shadow: "var(--shadow-card)",
};

function UserManagementPage() {
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeNow: 0,
    staffMembers: 0,
    lockedAccounts: 0,
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [timeTick, setTimeTick] = useState(Date.now());

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

  const getDisplayStatus = (accountStatus, online) => {
    if (accountStatus === "BANNED") return "Locked";
    if (online) return "Active";

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

  const formatTimeAgo = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const diffInSeconds = Math.floor((timeTick - date.getTime()) / 1000);

    if (diffInSeconds < 0) return "";
    if (diffInSeconds < 60) return "just now";

    const diffInMinutes = Math.floor(diffInSeconds / 60);

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusDisplayText = (user) => {
    if (user.status === "Locked") return "Locked";
    if (user.status === "Active") return "Active";

    const offlineTime = user.updatedAt || user.lastActiveAt;
    const offlineAgo = formatTimeAgo(offlineTime);

    if (!offlineAgo) return "Offline";

    return `Offline · ${offlineAgo}`;
  };

  const mapApiUserToTableUser = (user) => {
    return {
      id: user.id,
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
      lastActiveAt: user.lastActiveAt,
      updatedAt: user.updatedAt,
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

  const applyUserStatusEvent = (event) => {
    setUsers((prevUsers) => {
      const updatedUsers = prevUsers.map((user) => {
        if (user.id !== event.userId) {
          return user;
        }

        const nextAccountStatus = event.status || user.accountStatus;
        const nextOnline = Boolean(event.online);

        return {
          ...user,
          accountStatus: nextAccountStatus,
          online: nextOnline,
          status: getDisplayStatus(nextAccountStatus, nextOnline),
          lastLogin: event.lastLoginAt
            ? formatLastLogin(event.lastLoginAt)
            : user.lastLogin,
          lastActiveAt:
            event.lastActiveAt !== undefined
              ? event.lastActiveAt
              : user.lastActiveAt,
          updatedAt:
            event.updatedAt !== undefined ? event.updatedAt : user.updatedAt,
        };
      });

      setStats(calculateStats(updatedUsers));
      setTimeTick(Date.now());

      return updatedUsers;
    });
  };

  const fetchData = async (showInitialLoading = false) => {
    try {
      if (showInitialLoading) {
        setLoading(true);
      }

      const res = await userApi.getUsers();
      const apiUsers = Array.isArray(res.data) ? res.data : [];
      const mappedUsers = apiUsers.map(mapApiUserToTableUser);

      setUsers(mappedUsers);
      setStats(calculateStats(mappedUsers));
    } catch (error) {
      console.error("Lỗi kết nối API users:", error);

      setUsers((prevUsers) => {
        if (prevUsers.length > 0) {
          return prevUsers;
        }

        setStats({
          totalAccounts: 0,
          activeNow: 0,
          staffMembers: 0,
          lockedAccounts: 0,
        });

        return [];
      });
    } finally {
      if (showInitialLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(true);

    const intervalId = setInterval(() => {
      fetchData(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeTick(Date.now());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const streamUrl = userApi.getUserStatusStreamUrl();

    const eventSource = new EventSource(streamUrl, {
      withCredentials: true,
    });

    eventSource.addEventListener("CONNECTED", () => {
      setIsRealtimeConnected(true);
    });

    eventSource.addEventListener("USER_STATUS_CHANGED", (message) => {
      try {
        const event = JSON.parse(message.data);
        applyUserStatusEvent(event);
      } catch (error) {
        console.error("Cannot parse user status event:", error);
      }
    });

    eventSource.onerror = (error) => {
      console.error("User status stream error:", error);
      setIsRealtimeConnected(false);
    };

    return () => {
      eventSource.close();
      setIsRealtimeConnected(false);
    };
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

      await fetchData(false);
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

      await fetchData(false);
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

      await fetchData(false);
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
      String(user.phone || "").toLowerCase().includes(keyword);

    const matchesRole =
      selectedRole === "All Roles" || user.roles.includes(selectedRole);

    const matchesStatus =
      selectedStatus === "Any Status" || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const indexOfLastItem = safeCurrentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const emptyRowCount = Math.max(itemsPerPage - currentItems.length, 0);

  return (
    <div
      className="dashboard-layout"
      style={{
        display: "flex",
        width: "100vw",
        minHeight: "100vh",
        background: theme.page,
        color: theme.text,
      }}
    >
      <Sidebar />

      <main
        className="main-content"
        style={{
          flexGrow: 1,
          padding: "1.5rem 2rem",
          minHeight: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          overflowY: "auto",
          background: theme.page,
          color: theme.text,
        }}
      >
        <Header />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.85rem",
                fontWeight: "800",
                margin: 0,
                color: theme.text,
                letterSpacing: "-0.04em",
              }}
            >
              User Management
            </h1>

            <p
              style={{
                color: theme.muted,
                fontSize: "0.9rem",
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
              backgroundColor: theme.blue,
              color: "#ffffff",
              border: "none",
              padding: "0.65rem 1.2rem",
              borderRadius: "0.6rem",
              fontWeight: "700",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <UserPlus size={16} /> Add user
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "1rem",
          }}
        >
          <StatCard
            label="TOTAL ACCOUNTS"
            value={stats.totalAccounts.toLocaleString()}
            icon={<Users size={17} />}
            iconColor={theme.blue}
            valueColor={theme.text}
          />

          <StatCard
            label="ACTIVE NOW"
            value={stats.activeNow.toLocaleString()}
            icon={<UserCheck size={17} />}
            iconColor={theme.green}
            valueColor={theme.text}
          />

          <StatCard
            label="STAFF MEMBERS"
            value={stats.staffMembers.toLocaleString()}
            icon={<Shield size={17} />}
            iconColor="#6366f1"
            valueColor={theme.text}
          />

          <StatCard
            label="LOCKED ACCOUNTS"
            value={stats.lockedAccounts.toString().padStart(2, "0")}
            icon={<Lock size={17} />}
            iconColor={theme.red}
            valueColor={stats.lockedAccounts > 0 ? theme.red : theme.text}
            labelColor={stats.lockedAccounts > 0 ? theme.red : theme.muted}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flexGrow: 1, minWidth: "260px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: theme.muted,
              }}
            />

            <input
              type="text"
              placeholder="Filter by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={inputBaseStyle}
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setCurrentPage(1);
            }}
            style={selectBaseStyle}
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
            style={selectBaseStyle}
          >
            <option>Any Status</option>
            <option>Active</option>
            <option>Offline</option>
            <option>Locked</option>
          </select>
        </div>

        <div
          style={{
            backgroundColor: theme.card,
            borderRadius: "0.85rem",
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: "454px",
            boxShadow: theme.shadow,
          }}
        >
          {!loading && (
            <div
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "1rem",
                zIndex: 3,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                color: theme.muted,
                fontSize: "0.72rem",
                backgroundColor: theme.cardSoft,
                border: `1px solid ${theme.border}`,
                borderRadius: "999px",
                padding: "0.25rem 0.6rem",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: isRealtimeConnected ? theme.green : theme.muted,
                }}
              />
              {isRealtimeConnected ? "Realtime" : "Offline sync"}
            </div>
          )}

          {loading ? (
            <div
              style={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: theme.muted,
                fontSize: "0.9rem",
              }}
            >
              Synchronizing infrastructure data...
            </div>
          ) : (
            <div style={{ flexGrow: 1, overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "960px",
                  height: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "0.85rem",
                  color: theme.text,
                }}
              >
                <thead>
                  <tr
                    style={{
                      height: "62px",
                      borderBottom: `1px solid ${theme.border}`,
                      color: theme.muted,
                      backgroundColor: theme.tableHeader,
                    }}
                  >
                    <th style={{ padding: "0.9rem 1rem" }}>Full name</th>
                    <th style={{ padding: "0.9rem 1rem" }}>Email</th>
                    <th style={{ padding: "0.9rem 1rem" }}>Role</th>
                    <th style={{ padding: "0.9rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.9rem 1rem" }}>Last login</th>
                    <th style={{ padding: "0.9rem 1rem", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.length === 0 ? (
                    <tr style={{ height: "320px" }}>
                      <td
                        colSpan={6}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: theme.muted,
                          background: theme.tableRow,
                        }}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {currentItems.map((user) => (
                        <tr
                          key={user.id}
                          style={{
                            height: "76px",
                            borderBottom: `1px solid ${theme.border}`,
                            color: theme.text,
                            background: theme.tableRow,
                          }}
                        >
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
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: theme.blueSoft,
                                  border: `1px solid ${theme.border}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.75rem",
                                  fontWeight: "800",
                                  color: theme.blue,
                                  flexShrink: 0,
                                }}
                              >
                                {user.avatar}
                              </div>

                              <span
                                style={{
                                  fontWeight: "700",
                                  color: theme.text,
                                }}
                              >
                                {user.name}
                              </span>
                            </div>
                          </td>

                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              color: theme.muted,
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
                                    backgroundColor: theme.blueSoft,
                                    color: theme.blue,
                                    fontSize: "0.65rem",
                                    fontWeight: "800",
                                    padding: "0.18rem 0.45rem",
                                    borderRadius: "0.35rem",
                                    border: `1px solid ${theme.border}`,
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
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "50%",
                                  backgroundColor:
                                    user.status === "Active"
                                      ? theme.green
                                      : user.status === "Locked"
                                        ? theme.red
                                        : theme.muted,
                                }}
                              />

                              <span
                                style={{
                                  color:
                                    user.status === "Active"
                                      ? theme.green
                                      : user.status === "Locked"
                                        ? theme.red
                                        : theme.muted,
                                  fontWeight: "650",
                                }}
                              >
                                {getStatusDisplayText(user)}
                              </span>
                            </div>
                          </td>

                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              color: theme.muted,
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
                                style={iconButtonStyle}
                                title="Edit Role"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                onClick={() => triggerLockConfirmation(user)}
                                style={{
                                  ...iconButtonStyle,
                                  color:
                                    user.status === "Locked"
                                      ? theme.red
                                      : theme.muted,
                                }}
                                title={
                                  user.status === "Locked"
                                    ? "Unlock Account"
                                    : "Lock Account"
                                }
                              >
                                <Lock size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {Array.from({ length: emptyRowCount }).map((_, index) => (
                        <tr
                          key={`user-empty-space-${index}`}
                          style={{
                            height: "76px",
                            background: theme.tableRow,
                            borderBottom:
                              index === emptyRowCount - 1
                                ? "none"
                                : `1px solid ${theme.border}`,
                          }}
                        >
                          <td colSpan={6} />
                        </tr>
                      ))}
                    </>
                  )}
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
              borderTop: `1px solid ${theme.border}`,
              color: theme.muted,
              fontSize: "0.8rem",
              backgroundColor: theme.card,
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
              <PaginationButton
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft size={14} />
              </PaginationButton>

              {pageNumbers.map((number) => (
                <PaginationButton
                  key={number}
                  active={safeCurrentPage === number}
                  onClick={() => setCurrentPage(number)}
                >
                  {number}
                </PaginationButton>
              ))}

              <PaginationButton
                disabled={safeCurrentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
              >
                <ChevronRight size={14} />
              </PaginationButton>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <AddUserModal
          newFullName={newFullName}
          setNewFullName={setNewFullName}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          newPhone={newPhone}
          setNewPhone={setNewPhone}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          newRole={newRole}
          setNewRole={setNewRole}
          setIsModalOpen={setIsModalOpen}
          handleAddUserSubmit={handleAddUserSubmit}
        />
      )}

      {isEditRoleOpen && editingUser && (
        <EditRoleModal
          editingUser={editingUser}
          updatedRole={updatedRole}
          setUpdatedRole={setUpdatedRole}
          setIsEditRoleOpen={setIsEditRoleOpen}
          handleUpdateRoleSubmit={handleUpdateRoleSubmit}
        />
      )}

      {isLockModalOpen && userToLock && (
        <LockUserModal
          userToLock={userToLock}
          setIsLockModalOpen={setIsLockModalOpen}
          setUserToLock={setUserToLock}
          handleConfirmLockUser={handleConfirmLockUser}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconColor,
  valueColor,
  labelColor = theme.muted,
}) {
  return (
    <div
      style={{
        backgroundColor: theme.card,
        padding: "1.25rem",
        borderRadius: "0.85rem",
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        minHeight: "100px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: labelColor,
          fontSize: "0.7rem",
          fontWeight: "800",
          letterSpacing: "0.05em",
        }}
      >
        <span>{label}</span>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>

      <h2
        style={{
          fontSize: "1.8rem",
          fontWeight: "800",
          margin: "0.35rem 0 0 0",
          color: valueColor,
        }}
      >
        {value}
      </h2>
    </div>
  );
}

function AddUserModal({
  newFullName,
  setNewFullName,
  newEmail,
  setNewEmail,
  newPhone,
  setNewPhone,
  newPassword,
  setNewPassword,
  newRole,
  setNewRole,
  setIsModalOpen,
  handleAddUserSubmit,
}) {
  return (
    <ModalShell>
      <ModalCard width="460px">
        <ModalHeader title="Provision New Account" onClose={() => setIsModalOpen(false)} />

        <form onSubmit={handleAddUserSubmit} style={{ display: "grid", gap: "1rem" }}>
          <ModalField label="FULL NAME">
            <input
              type="text"
              required
              placeholder="Nguyen Van A"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              style={modalInputStyle}
            />
          </ModalField>

          <ModalField label="EMAIL ADDRESS">
            <input
              type="email"
              required
              placeholder="staff@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={modalInputStyle}
            />
          </ModalField>

          <ModalField label="PHONE">
            <input
              type="text"
              placeholder="0900000000"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              style={modalInputStyle}
            />
          </ModalField>

          <ModalField label="PASSWORD">
            <input
              type="password"
              required
              placeholder="Password@123"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={modalInputStyle}
            />
          </ModalField>

          <ModalField label="ASSIGN ROLE">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={modalInputStyle}
            >
              <option value="PARKING MANAGEMENT">PARKING MANAGEMENT</option>
              <option value="PARKING STAFF">PARKING STAFF</option>
              <option value="USER">USER</option>
            </select>
          </ModalField>

          <ModalActions>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>

            <button type="submit" style={primaryButtonStyle}>
              Grant Access
            </button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalShell>
  );
}

function EditRoleModal({
  editingUser,
  updatedRole,
  setUpdatedRole,
  setIsEditRoleOpen,
  handleUpdateRoleSubmit,
}) {
  return (
    <ModalShell>
      <ModalCard width="420px">
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
              color: theme.blue,
            }}
          >
            <ShieldAlert size={18} />

            <h3
              style={{
                margin: 0,
                color: theme.text,
                fontSize: "1.1rem",
                fontWeight: "700",
              }}
            >
              Modify User Role
            </h3>
          </div>

          <button
            onClick={() => setIsEditRoleOpen(false)}
            style={iconButtonStyle}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            backgroundColor: theme.cardSoft,
            padding: "0.85rem",
            borderRadius: "0.65rem",
            marginBottom: "1.25rem",
            border: `1px solid ${theme.border}`,
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", color: theme.muted }}>
            Selected Operator:
          </p>

          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "0.9rem",
              color: theme.text,
              fontWeight: "700",
            }}
          >
            {editingUser.name}
          </p>

          <p
            style={{
              margin: "2px 0 0 0",
              fontSize: "0.8rem",
              color: theme.muted,
            }}
          >
            {editingUser.email}
          </p>
        </div>

        <form
          onSubmit={handleUpdateRoleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <ModalField label="SELECT SYSTEM SECURITY LEVEL">
            <select
              value={updatedRole}
              onChange={(e) => setUpdatedRole(e.target.value)}
              style={modalInputStyle}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="PARKING MANAGEMENT">PARKING MANAGEMENT</option>
              <option value="PARKING STAFF">PARKING STAFF</option>
              <option value="USER">USER</option>
            </select>
          </ModalField>

          <ModalActions>
            <button
              type="button"
              onClick={() => setIsEditRoleOpen(false)}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>

            <button type="submit" style={primaryButtonStyle}>
              Save Changes
            </button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalShell>
  );
}

function LockUserModal({
  userToLock,
  setIsLockModalOpen,
  setUserToLock,
  handleConfirmLockUser,
}) {
  const isLocked = userToLock.status === "Locked";

  const closeModal = () => {
    setIsLockModalOpen(false);
    setUserToLock(null);
  };

  return (
    <ModalShell>
      <ModalCard width="440px">
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
              backgroundColor: isLocked ? theme.greenSoft : theme.redSoft,
              color: isLocked ? theme.green : theme.red,
              padding: "0.55rem",
              borderRadius: "0.65rem",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>

          <div style={{ flexGrow: 1 }}>
            <h3
              style={{
                margin: 0,
                color: theme.text,
                fontSize: "1.1rem",
                fontWeight: "700",
              }}
            >
              {isLocked ? "Unlock Account" : "Lock Account"}
            </h3>

            <p
              style={{
                margin: "4px 0 0 0",
                color: theme.muted,
                fontSize: "0.85rem",
                lineHeight: "1.4",
              }}
            >
              {isLocked
                ? "Are you sure you want to unlock this account?"
                : "Are you sure you want to lock this account?"}
            </p>
          </div>

          <button onClick={closeModal} style={iconButtonStyle}>
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            backgroundColor: theme.cardSoft,
            padding: "0.9rem",
            borderRadius: "0.65rem",
            marginBottom: "1.5rem",
            border: `1px solid ${theme.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  color: theme.text,
                }}
              >
                {userToLock.name}
              </span>

              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: theme.muted,
                  marginTop: "2px",
                }}
              >
                {userToLock.email}
              </span>
            </div>

            <span
              style={{
                backgroundColor: isLocked ? theme.greenSoft : theme.redSoft,
                color: isLocked ? theme.green : theme.red,
                fontSize: "0.65rem",
                fontWeight: "800",
                padding: "0.22rem 0.55rem",
                borderRadius: "0.35rem",
                whiteSpace: "nowrap",
              }}
            >
              {isLocked ? "LOCKED" : "ACTIVE"}
            </span>
          </div>

          <div
            style={{
              borderTop: `1px solid ${theme.border}`,
              marginTop: "0.75rem",
              paddingTop: "0.6rem",
              fontSize: "0.75rem",
              color: theme.muted,
            }}
          >
            {isLocked
              ? "Warning: This user will be able to log in again after unlocking."
              : "Warning: This user will not be able to log in until the account is unlocked."}
          </div>
        </div>

        <ModalActions>
          <button type="button" onClick={closeModal} style={secondaryButtonStyle}>
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmLockUser}
            style={{
              ...primaryButtonStyle,
              backgroundColor: isLocked ? theme.green : theme.red,
            }}
          >
            {isLocked ? "Confirm Unlock" : "Confirm Lock"}
          </button>
        </ModalActions>
      </ModalCard>
    </ModalShell>
  );
}

function ModalShell({ children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
    >
      {children}
    </div>
  );
}

function ModalCard({ children, width }) {
  return (
    <div
      style={{
        backgroundColor: theme.card,
        border: `1px solid ${theme.border}`,
        width,
        maxWidth: "100%",
        borderRadius: "0.85rem",
        padding: "1.5rem",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
        color: theme.text,
      }}
    >
      {children}
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
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
          color: theme.text,
          fontSize: "1.1rem",
          fontWeight: "700",
        }}
      >
        {title}
      </h3>

      <button onClick={onClose} style={iconButtonStyle}>
        <X size={18} />
      </button>
    </div>
  );
}

function ModalField({ label, children }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.5rem",
        color: theme.muted,
        fontSize: "0.75rem",
        fontWeight: "700",
      }}
    >
      {label}
      {children}
    </label>
  );
}

function ModalActions({ children }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.75rem",
        marginTop: "0.5rem",
      }}
    >
      {children}
    </div>
  );
}

function PaginationButton({ children, active = false, disabled = false, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: active ? theme.blue : theme.input,
        border: active ? `1px solid ${theme.blue}` : `1px solid ${theme.border}`,
        color: active ? "#ffffff" : disabled ? theme.muted : theme.text,
        minWidth: "32px",
        height: "32px",
        borderRadius: "0.45rem",
        fontWeight: "700",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

const inputBaseStyle = {
  width: "100%",
  backgroundColor: "var(--bg-input)",
  border: "1px solid var(--border-color)",
  borderRadius: "0.6rem",
  padding: "0.65rem 1rem 0.65rem 2.2rem",
  color: "var(--text-main)",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
};

const selectBaseStyle = {
  backgroundColor: "var(--bg-input)",
  color: "var(--text-main)",
  border: "1px solid var(--border-color)",
  borderRadius: "0.6rem",
  padding: "0.65rem 1rem",
  fontSize: "0.9rem",
  outline: "none",
  cursor: "pointer",
  minWidth: "160px",
};

const modalInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: "var(--bg-input)",
  border: "1px solid var(--border-color)",
  borderRadius: "0.55rem",
  padding: "0.7rem 0.8rem",
  color: "var(--text-main)",
  fontSize: "0.9rem",
  outline: "none",
};

const iconButtonStyle = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  padding: "4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const primaryButtonStyle = {
  backgroundColor: "var(--primary-blue)",
  border: "none",
  color: "#ffffff",
  padding: "0.6rem 1rem",
  borderRadius: "0.55rem",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "0.9rem",
};

const secondaryButtonStyle = {
  backgroundColor: "var(--bg-input)",
  border: "1px solid var(--border-color)",
  color: "var(--text-main)",
  padding: "0.6rem 1rem",
  borderRadius: "0.55rem",
  cursor: "pointer",
  fontWeight: "650",
  fontSize: "0.9rem",
};

export default UserManagementPage;