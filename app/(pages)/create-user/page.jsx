"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import { useAuth } from "../../components/AuthContext";
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Shield,
  Users,
  X,
  AlertCircle,
  Crown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List
} from "lucide-react";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import "../../styles/pages/create-user.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const USERS_PER_PAGE = 10;

const ROLE_OPTIONS = [
  { value: "superadmin", label: "Super Admin", icon: Crown, description: "Full system access with super admin privileges", color: "#8b5cf6" },
  { value: "operator", label: "Operator", icon: Users, description: "Basic operations", color: "#3b82f6" },
];

function CreateUserContent() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    name: "", 
    role: "operator", 
    password: "", 
    confirmPassword: "" 
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(USERS_PER_PAGE);

  // UPDATED: Only allow superadmin to access this page
  useEffect(() => { 
    if (user && user.role !== "superadmin") {
      toast.error("You don't have permission to access this page");
      router.push("/dashboard"); 
    }
  }, [user, router, toast]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const fetchUsers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const url = `${API_URL}/users`;
      console.log("Fetching users from:", url);
      
      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API Response:", data);
      
      if (data && data.status === true && data.data && Array.isArray(data.data)) {
        setUsers(data.data);
      } else if (Array.isArray(data)) {
        setUsers(data);
      } else if (data && data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        console.error("Unexpected API response format:", data);
        setUsers([]);
        if (!silent) toast.error("Unexpected API response format");
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      setUsers([]);
      
      if (!silent) {
        if (error.message.includes("Failed to fetch")) {
          toast.error("Cannot connect to server. Please check if the server is running.");
        } else {
          toast.error(`Failed to fetch users: ${error.message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingUser && !form.password) {
      toast.error("Password is required."); 
      return;
    }

    if (!editingUser && form.password.length < 6) { 
      toast.error("Password must be at least 6 characters."); 
      return; 
    }

    if (form.password && form.password.length < 6) {
      toast.error("Password must be at least 6 characters."); 
      return;
    }
    
    if (form.password !== form.confirmPassword) { 
      toast.error("Passwords do not match."); 
      return; 
    }

    setOperationLoading(true);

    try {
      if (editingUser) {
        // Update existing user
        const url = `${API_URL}/users/${editingUser.id}`;
        console.log("PUT request to:", url);
        
        const payload = {
          name: form.name,
          role: form.role,
          ...(form.password && { password: form.password }),
        };

        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.message || "Failed to update user");
        }

        const responseData = await response.json();
        console.log("PUT response:", responseData);
        
        // Handle different response structures
        let updatedUser;
        if (responseData && responseData.data) {
          updatedUser = responseData.data;
        } else if (responseData && responseData.status === true) {
          updatedUser = responseData;
        } else {
          updatedUser = responseData;
        }
        
        setUsers((prev) => prev.map((u) => u.id === editingUser.id ? updatedUser : u));
        toast.success(
          <>
            User <strong>{form.name}</strong> updated successfully!
          </>
        );

      } else {
        // Create new user
        const url = `${API_URL}/users`;
        console.log("POST request to:", url);
        
        const payload = {
          name: form.name,
          role: form.role,
          password: form.password,
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.message || "Failed to create user");
        }

        const responseData = await response.json();
        console.log("POST response:", responseData);
        
        // Handle different response structures
        let newUser;
        if (responseData && responseData.data) {
          newUser = responseData.data;
        } else if (responseData && responseData.status === true) {
          newUser = responseData;
        } else {
          newUser = responseData;
        }
        
        setUsers((prev) => [...prev, newUser]);
        toast.success(
          <>
            User <strong>{form.name}</strong> created successfully!
          </>
        );
      }

      // Reset form
      setForm({ name: "", role: "operator", password: "", confirmPassword: "" });
      setEditingUser(null);
      setShowForm(false);
      
      // Refresh user list
      fetchUsers(true);

    } catch (error) {
      console.error("User operation error:", error);
      toast.error(error.message || "An error occurred. Please try again.");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      role: u.role.toLowerCase ? u.role.toLowerCase() : u.role,
      password: "", 
      confirmPassword: ""
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setForm({ name: "", role: "operator", password: "", confirmPassword: "" });
    setEditingUser(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    setOperationLoading(true);
    try {
      const deletedUser = users.find(u => u.id === id);

      const url = `${API_URL}/users/${id}`;
      console.log("DELETE request to:", url);
      
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to delete user");
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeleteId(null);
      
      // Adjust current page if needed
      const totalPages = Math.ceil((filteredUsers.length - 1) / itemsPerPage);
      if (currentPage > totalPages) {
        setCurrentPage(Math.max(1, totalPages));
      }
      
      toast.success(
        <>
          User <strong>{deletedUser.name}</strong> deleted successfully!
        </>
      );

    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete user. Please try again.");
    } finally {
      setOperationLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const roleLower = role?.toLowerCase?.() || role;
    const roleOption = ROLE_OPTIONS.find(r => r.value === roleLower);
    if (!roleOption) {
      return <Shield size={14} color="#6b7280" />;
    }
    const Icon = roleOption.icon;
    return <Icon size={14} color={roleOption.color} />;
  };

  const getRoleDisplayName = (role) => {
    if (!role) return "Unknown";
    const roleLower = role.toLowerCase?.() || role;
    const roleOption = ROLE_OPTIONS.find(r => r.value === roleLower);
    if (roleOption) {
      return roleOption.label;
    }
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesRole = roleFilter === "all" || u.role?.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  // UPDATED: Check user permissions - only superadmin can access
  if (user?.role !== "superadmin") {
    return null;
  }

  // Render user in list view
  const renderListView = () => (
    <table className="users-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {currentUsers.map((u) => (
          <tr key={u.id} className="user-row">
            <td>
              <div className="user-info">
                <div className="user-avatar">
                  {u.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="user-details">
                  <span className="user-name">{u.name}</span>
                </div>
              </div>
            </td>
            <td>
              <span className={`role-badge ${u.role?.toLowerCase() || 'unknown'}`}>
                {getRoleIcon(u.role)}
                <span>{getRoleDisplayName(u.role)}</span>
              </span>
            </td>
            <td>
              <div className="action-buttons">
                <button 
                  className="action-icon-btn edit" 
                  onClick={() => handleEdit(u)} 
                  title="Edit user"
                  disabled={operationLoading}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  className="action-icon-btn delete" 
                  onClick={() => setDeleteId(u.id)} 
                  title="Delete user"
                  disabled={operationLoading}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Render user in grid view
  const renderGridView = () => (
    <div className="users-grid">
      {currentUsers.map((u) => (
        <div key={u.id} className="user-card">
          <div className="user-card-header">
            <div className="user-avatar-large">
              {u.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className={`role-badge ${u.role?.toLowerCase() || 'unknown'}`}>
              {getRoleIcon(u.role)}
              <span>{getRoleDisplayName(u.role)}</span>
            </span>
          </div>
          <div className="user-card-body">
            <h3 className="user-name-large">{u.name}</h3>
          </div>
          <div className="user-card-footer">
            <button 
              className="action-btn edit" 
              onClick={() => handleEdit(u)} 
              title="Edit user"
              disabled={operationLoading}
            >
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
            <button 
              className="action-btn delete" 
              onClick={() => setDeleteId(u.id)} 
              title="Delete user"
              disabled={operationLoading}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AppLayout>
      <div className="users-container">

        {/* Header Section */}
        <div className="users-header-section">
          <div>
            <h1 className="users-main-title">User Management</h1>
            <p className="users-subtitle">Manage system users and their permissions</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn-primary"
              onClick={() => { handleCancel(); setShowForm(true); }}
              disabled={operationLoading}
            >
              <UserPlus size={18} />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        {/* Create/Edit User Form */}
        {showForm && (
          <div className="create-user-card">
            <div className="card-header">
              <h2>{editingUser ? "Edit User" : "Create New User"}</h2>
              <button className="close-btn" onClick={handleCancel} disabled={operationLoading}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    className="form-input" 
                    name="name" 
                    value={form.name} 
                    onChange={handleInputChange} 
                    placeholder="Enter full name"
                    required 
                    disabled={operationLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <div className="custom-select-wrapper">
                    <select 
                      className="custom-select"
                      name="role" 
                      value={form.role} 
                      onChange={handleInputChange}
                      disabled={operationLoading}
                    >
                      {ROLE_OPTIONS.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="role-description">
                    {ROLE_OPTIONS.find(r => r.value === form.role)?.description}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                  </label>
                  <div className="password-input-wrapper">
                    <input 
                      className="form-input password-input" 
                      type={showPassword ? "text" : "password"}
                      name="password" 
                      value={form.password} 
                      onChange={handleInputChange} 
                      placeholder={editingUser ? "Leave blank to keep current" : "Minimum 6 characters"}
                      required={!editingUser}
                      minLength={6}
                      disabled={operationLoading}
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn" 
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={operationLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input 
                      className="form-input password-input" 
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword" 
                      value={form.confirmPassword} 
                      onChange={handleInputChange} 
                      placeholder="Re-enter password"
                      required={!editingUser && form.password !== ""}
                      minLength={6}
                      disabled={operationLoading}
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={operationLoading}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </button>
                  </div>
                </div>

              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={operationLoading}>
                  {operationLoading ? "Processing..." : (editingUser ? "Update User" : "Create User")}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={operationLoading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters and View Toggle Section */}
        <div className="filters-section">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={operationLoading}
            />
          </div>
          <div className="filter-group">
            <select 
              className="filter-select" 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              disabled={operationLoading}
            >
              <option value="all">All Roles</option>
              {ROLE_OPTIONS.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
              disabled={operationLoading}
            >
              <ViewListIcon size={18} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              disabled={operationLoading}
            >
              <GridViewIcon size={18} />
            </button>
          </div>
        </div>

        {/* Users Display */}
        <div className={`users-${viewMode}-card`}>
          <div className="table-header">
            <span className="users-count">
              {totalItems} users
            </span>
          </div>

          <div className={`${viewMode === 'list' ? 'table-wrapper' : 'grid-wrapper'}`}>
            {loading ? (
              <div className="no-results">
                <p>Loading users...</p>
              </div>
            ) : (
              viewMode === 'list' ? renderListView() : renderGridView()
            )}

            {!loading && filteredUsers.length === 0 && (
              <div className="no-results">
                <Users size={48} />
                <h3>No users found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && filteredUsers.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Page {currentPage} of {totalPages}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1 || operationLoading}
                  title="First Page"
                >
                  <ChevronsLeft size={18} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1 || operationLoading}
                  title="Previous Page"
                >
                  <ChevronLeft size={18} />
                </button>
                
                {/* Page Numbers */}
                <div className="pagination-pages">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={operationLoading}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="pagination-btn"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages || operationLoading}
                  title="Next Page"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages || operationLoading}
                  title="Last Page"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="modal-overlay" onClick={() => !operationLoading && setDeleteId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon error"><AlertCircle size={32} /></div>
            <h3 className="modal-title">Delete User?</h3>
            <p className="modal-body">
              This action cannot be undone. The user will lose all access immediately.
            </p>
            <div className="modal-actions">
              <button 
                className="btn btn-danger" 
                onClick={() => handleDelete(deleteId)}
                disabled={operationLoading}
              >
                {operationLoading ? "Deleting..." : "Yes, Delete"}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeleteId(null)}
                disabled={operationLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}

export default function CreateUser() {
  return (
    <ToastProvider>
      <CreateUserContent />
    </ToastProvider>
  );
}