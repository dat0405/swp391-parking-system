import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, Pencil, Key, X, ShieldAlert, AlertTriangle,
  Users, Shield, Lock, UserCheck, Trash2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import Header from '../dashboard/Header';
import Sidebar from '../dashboard/Sidebar';

function UserManagementPage() {
  // 1. STATE QUẢN LÝ DỮ LIỆU
  const [stats, setStats] = useState({ totalAccounts: 0, activeNow: 0, staffMembers: 0, lockedAccounts: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // State hỗ trợ UI Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedStatus, setSelectedStatus] = useState('Any Status');

  // State Modal "Add User"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('PARKING MANAGEMENT');

  // State Modal "Edit Role" (Kích hoạt khi bấm nút Cây bút)
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [updatedRole, setUpdatedRole] = useState('');

  // ✨ STATE CUSTOM DELETE MODAL (Hiển thị trực tiếp trên UI thay cho alert trình duyệt)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null); // Lưu { id, roles, name } của user sắp bị xóa

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 

  // =========================================================================
  // 2. FETCH DATA MOCK / API
  // =========================================================================
  const fetchData = async () => {
    try {
      setLoading(true);
      setTimeout(() => {
        setStats({ totalAccounts: 1284, activeNow: 1180, staffMembers: 42, lockedAccounts: 8 });
        setUsers([
          { id: 'USR-0941', name: 'Julianne Devis', email: 'j.devis@parksystem.pro', roles: ['ADMIN'], status: 'Active', lastLogin: '2 mins ago', avatar: 'JD' },
          { id: 'USR-1022', name: 'Marcus Kraul', email: 'm.kraul@parksystem.pro', roles: ['PARKING MANAGEMENT'], status: 'Offline', lastLogin: '4 hours ago', avatar: 'MK' },
          { id: 'USR-0882', name: 'Lukas Sterling', email: 'l.sterling@parksystem.pro', roles: ['PARKING STAFF'], status: 'Locked', lastLogin: 'Oct 12, 2023', avatar: 'LS' },
          { id: 'USR-1105', name: 'Aria Wong', email: 'aria.w@parksystem.pro', roles: ['USER'], status: 'Active', lastLogin: 'Just now', avatar: 'AW' },
          { id: 'USR-1201', name: 'Nguyen Van A', email: 'a.nguyen@parksystem.pro', roles: ['PARKING MANAGEMENT'], status: 'Active', lastLogin: '10 mins ago', avatar: 'VA' },
          { id: 'USR-1202', name: 'Tran Thi B', email: 'b.tran@parksystem.pro', roles: ['PARKING STAFF'], status: 'Offline', lastLogin: '1 day ago', avatar: 'TB' },
          { id: 'USR-1203', name: 'Le Van C', email: 'c.le@parksystem.pro', roles: ['USER'], status: 'Locked', lastLogin: '3 days ago', avatar: 'LC' }
        ]);
        setLoading(false);
      }, 400);
    } catch (error) {
      console.error("Lỗi kết nối API:", error);
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
  }, []);

  // =========================================================================
  // 3. LOGIC XỬ LÝ EVENT NGHIỆP VỤ
  // =========================================================================

  // 🔑 KHÓA / MỞ KHÓA TÀI KHOẢN (Gắn với nút Chìa khóa)
  const handleToggleLockUser = async (userId, currentStatus) => {
    const isCurrentlyLocked = currentStatus === 'Locked';
    const nextStatus = isCurrentlyLocked ? 'Offline' : 'Locked';

    try {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
      setStats(prev => ({
        ...prev,
        lockedAccounts: isCurrentlyLocked ? Math.max(0, prev.lockedAccounts - 1) : prev.lockedAccounts + 1
      }));
    } catch (error) {
      console.error("Lỗi khi thay đổi trạng thái khóa:", error);
    }
  };

  // ⚙️ MỞ MODAL THAY ĐỔI ROLE (Gắn với nút Cây bút)
  const openEditRoleModal = (user) => {
    setEditingUser(user);
    setUpdatedRole(user.roles[0] || 'USER');
    setIsEditRoleOpen(true);
  };

  // Cập nhật Role sau khi xác nhận form
  const handleUpdateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const oldRole = editingUser.roles[0];
      const wasStaff = oldRole === 'PARKING MANAGEMENT' || oldRole === 'PARKING STAFF';
      const isNowStaff = updatedRole === 'PARKING MANAGEMENT' || updatedRole === 'PARKING STAFF';

      let staffAdjustment = 0;
      if (wasStaff && !isNowStaff) staffAdjustment = -1;
      if (!wasStaff && isNowStaff) staffAdjustment = 1;

      setStats(prev => ({ ...prev, staffMembers: Math.max(0, prev.staffMembers + staffAdjustment) }));
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, roles: [updatedRole] } : u));
      
      setIsEditRoleOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Lỗi khi cập nhật quyền hạn:", error);
    }
  };

  // 🗑️ TRIGGER MỞ CUSTOM MODAL XÓA TÀI KHOẢN
  const triggerDeleteConfirmation = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // HÀM THỰC THI XÓA SAU KHI CLICK XÁC NHẬN TRÊN CUSTOM MODAL
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // 🛠️ BE API Real Route: await fetch(`.../users/${userToDelete.id}`, { method: 'DELETE' });

      const isStaffOrManagement = userToDelete.roles.some(r => r === 'PARKING MANAGEMENT' || r === 'PARKING STAFF');

      setStats(prev => ({
        ...prev,
        totalAccounts: Math.max(0, prev.totalAccounts - 1),
        staffMembers: isStaffOrManagement ? Math.max(0, prev.staffMembers - 1) : prev.staffMembers
      }));

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      
      // Đóng modal và reset trạng thái hình ảnh lưu trữ tạm thời
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Lỗi khi xóa tài khoản:", error);
    }
  };

  // THÊM MỚI TÀI KHOẢN
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      const mockNewUser = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: newEmail.split('@')[0].toUpperCase(),
        email: newEmail,
        roles: [newRole],
        status: 'Offline',
        lastLogin: 'Never',
        avatar: newEmail.substring(0, 2).toUpperCase()
      };

      setUsers(prev => [mockNewUser, ...prev]);
      setStats(prev => ({ ...prev, totalAccounts: prev.totalAccounts + 1, staffMembers: prev.staffMembers + 1 }));
      
      setNewEmail('');
      setIsModalOpen(false);
    } catch (error) {
      console.error("Lỗi thêm tài khoản mới:", error);
    }
  };

  // =========================================================================
  // 4. LOGIC LỌC & PHÂN TRANG
  // =========================================================================
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'All Roles' || user.roles.includes(selectedRole);
    const matchesStatus = selectedStatus === 'Any Status' || user.status === selectedStatus;
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
    <div className="dashboard-layout" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <main className="main-content" style={{ flexGrow: 1, padding: '1.5rem 2rem', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
        <Header fullName="Võ Hoàng Anh" role="Administrator" />

        {/* Top Title Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, color: '#fff' }}>User Management</h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Configure access levels and manage system operators.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
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
        <Header fullName="Võ Hoàng Anh" role="Administrator" />

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

        {/* KPI Panel Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#111827', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em' }}><span>TOTAL ACCOUNTS</span><Users size={16} style={{ color: '#3b82f6' }} /></div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0.25rem 0 0 0', color: '#fff' }}>{stats.totalAccounts.toLocaleString()}</h2>
          </div>
          <div style={{ backgroundColor: '#111827', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em' }}><span>ACTIVE NOW</span><UserCheck size={16} style={{ color: '#10b981' }} /></div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0.25rem 0 0 0', color: '#fff' }}>{stats.activeNow.toLocaleString()}</h2>
          </div>
          <div style={{ backgroundColor: '#111827', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em' }}><span>STAFF MEMBERS</span><Shield size={16} style={{ color: '#6366f1' }} /></div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0.25rem 0 0 0', color: '#fff' }}>{stats.staffMembers}</h2>
          </div>
          <div style={{ backgroundColor: '#111827', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em' }}><span>LOCKED ACCOUNTS</span><Lock size={16} style={{ color: '#ef4444' }} /></div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0.25rem 0 0 0', color: '#ef4444' }}>{stats.lockedAccounts.toString().padStart(2, '0')}</h2>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input 
              type="text" placeholder="Filter by name, email, or ID..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.5rem 1rem 0.5rem 2.2rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
          <select value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }} style={{ backgroundColor: '#111827', color: '#fff', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
            <option>All Roles</option><option>ADMIN</option><option>PARKING MANAGEMENT</option><option>PARKING STAFF</option><option>USER</option>
          </select>
          <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }} style={{ backgroundColor: '#111827', color: '#fff', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
            <option>Any Status</option><option>Active</option><option>Offline</option><option>Locked</option>
          </select>
        </div>

        {/* Data Table */}
        <div style={{ backgroundColor: '#111827', borderRadius: '0.75rem', border: '1px solid #1e293b', overflow: 'hidden', flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {loading ? (
            <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              Synchronizing infrastructure data...
            </div>
          ) : (
            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#111827', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>User ID</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Full name</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Email</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Last login</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#cbd5e1' }}>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{user.id}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1e293b', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#3b82f6' }}>
                            {user.avatar}
                          </div>
                          <span style={{ fontWeight: '600', color: '#fff' }}>{user.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{user.email}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {user.roles.map((r, idx) => (
                            <span key={idx} style={{ backgroundColor: '#1e293b', color: '#93c5fd', fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>{r}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: user.status === 'Active' ? '#10b981' : user.status === 'Locked' ? '#ef4444' : '#64748b' }} />
                          <span style={{ color: user.status === 'Active' ? '#10b981' : user.status === 'Locked' ? '#ef4444' : '#64748b', fontWeight: '500' }}>{user.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{user.lastLogin}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                          
                          {/* 🔄 NÚT CÂY BÚT (Dùng để sửa đổi Role) */}
                          <button 
                            onClick={() => openEditRoleModal(user)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
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
                          
                          {/* 🔐 NÚT CHÌA KHÓA (Giữ chức năng Khóa tài khoản) */}
                          <button 
                            onClick={() => handleToggleLockUser(user.id, user.status)} 
                            style={{ background: 'none', border: 'none', color: user.status === 'Locked' ? '#ef4444' : '#94a3b8', cursor: 'pointer' }}
                            title="Toggle Account Lock"
                          >
                            <Key size={14} />
                          </button>
                          
                          {/* 🗑️ NÚT XÓA (Kích hoạt mở Custom Modal UI trực tiếp) */}
                          <button 
                            onClick={() => triggerDeleteConfirmation(user)} 
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            title="Delete User"
                          >
                            <Trash2 size={14} />

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

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #1e293b', color: '#64748b', fontSize: '0.8rem', backgroundColor: '#111827', flexShrink: 0 }}>
            <span>Showing <b>{filteredUsers.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, filteredUsers.length)}</b> of <b>{filteredUsers.length}</b> users</span>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ backgroundColor: '#1e293b', border: '1px solid #1e293b', color: currentPage === 1 ? '#475569' : '#94a3b8', width: '32px', height: '32px', borderRadius: '0.375rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={14} /></button>
              {pageNumbers.map(number => (
                <button key={number} onClick={() => setCurrentPage(number)} style={{ backgroundColor: currentPage === number ? '#3b82f6' : '#1e293b', border: '1px solid #1e293b', color: currentPage === number ? '#fff' : '#94a3b8', width: '32px', height: '32px', borderRadius: '0.375rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{number}</button>
              ))}
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ backgroundColor: '#1e293b', border: '1px solid #1e293b', color: currentPage === totalPages ? '#475569' : '#94a3b8', width: '32px', height: '32px', borderRadius: '0.375rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={14} /></button>
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

      {/* MODAL 1: ADD USER FORM */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(3, 7, 18, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', width: '420px', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '600' }}>Provision New Account</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>USER EMAIL ADDRESS</label>
                <input type="email" required placeholder="name@parksystem.pro" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#0b0f19', border: '1px solid #1e293b', borderRadius: '0.375rem', padding: '0.6rem 0.75rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>ASSIGN INFRASTRUCTURE ROLE</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: '100%', backgroundColor: '#0b0f19', border: '1px solid #1e293b', borderRadius: '0.375rem', padding: '0.6rem 0.75rem', color: '#fff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                  <option value="PARKING MANAGEMENT">PARKING MANAGEMENT</option>
                  <option value="PARKING STAFF">PARKING STAFF</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ backgroundColor: 'transparent', border: '1px solid #1e293b', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ backgroundColor: '#3b82f6', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}>Grant Access</button>
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

      {/* MODAL 2: EDIT USER ROLE FORM */}
      {isEditRoleOpen && editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(3, 7, 18, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', width: '420px', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6' }}>
                <ShieldAlert size={18} />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '600' }}>Modify User Role</h3>
              </div>
              <button onClick={() => setIsEditRoleOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ backgroundColor: '#0b0f19', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.02)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Selected Operator:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#fff', fontWeight: '600' }}>{editingUser.name}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{editingUser.email}</p>
            </div>

            <form onSubmit={handleUpdateRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>SELECT SYSTEM SECURITY LEVEL</label>
                <select 
                  value={updatedRole} 
                  onChange={(e) => setUpdatedRole(e.target.value)} 
                  style={{ width: '100%', backgroundColor: '#0b0f19', border: '1px solid #1e293b', borderRadius: '0.375rem', padding: '0.6rem 0.75rem', color: '#fff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsEditRoleOpen(false)} style={{ backgroundColor: 'transparent', border: '1px solid #1e293b', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ backgroundColor: '#3b82f6', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
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

      {/* =========================================================================
         ✨ MODAL 3: CUSTOM DELETE CONFIRMATION MODAL (HIỂN THỊ THẲNG LÊN UI)
         ========================================================================= */}
      {isDeleteModalOpen && userToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(3, 7, 18, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', width: '440px', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            
            {/* Header Modal */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem', borderRadius: '0.5rem', flexShrink: 0 }}>
                <AlertTriangle size={22} />
              </div>
              <div style={{ flexGrow: 1 }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '600' }}>Delete Account</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  Are you sure you want to delete this account?!!!!
                </p>
              </div>
              <button onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', marginTop: '2px' }}><X size={18} /></button>
            </div>

            {/* Thông tin User bị ảnh hưởng */}
            <div style={{ backgroundColor: '#0b0f19', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ block: 'span', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1' }}>{userToDelete.name}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{userToDelete.email}</span>
                </div>
                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>
                  {userToDelete.id}
                </span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '0.75rem', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                ⚠️ Warning: This action cannot be undone and infrastructure configurations for this user will be removed.
              </div>
            </div>

            {/* Nhóm Button điều hướng hành động */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }} 
                style={{ backgroundColor: 'transparent', border: '1px solid #1e293b', color: '#94a3b8', padding: '0.55rem 1.2rem', borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDeleteUser} 
                style={{ backgroundColor: '#ef4444', border: 'none', color: '#fff', padding: '0.55rem 1.2rem', borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Confirm Delete
              </button>
            </div>

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