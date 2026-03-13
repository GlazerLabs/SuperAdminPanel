// Permission definitions: key, label, description (for toggles in Add/Edit Role form)
export const PERMISSIONS = [
  { key: "all", label: "All Permission", description: "This user can do all the things." },
  { key: "create_user", label: "Create New User", description: "This user can generate new users." },
  { key: "dashboard", label: "Dashboard", description: "This user can view and manage the dashboard." },
  { key: "daily_activity", label: "Daily Activity", description: "This user can view and manage daily activity." },
  { key: "members", label: "Members", description: "This user can manage members and teams." },
  { key: "tournaments", label: "Tournaments", description: "This user can create and manage tournaments." },
  { key: "analytics", label: "Analytics", description: "This user can view analytics and reports." },
  { key: "settings", label: "Settings", description: "This user can change system settings." },
];

// Default roles (each role has name, description, permissions, and memberCount for card display)
export const MOCK_ROLES = [
  {
    id: "1",
    name: "Super Admin",
    description: "Full access to all features and settings.",
    permissions: PERMISSIONS.map((p) => p.key),
    memberCount: 2,
  },
  {
    id: "2",
    name: "Admin",
    description: "Manage users, dashboard, and daily activity.",
    permissions: ["create_user", "dashboard", "daily_activity", "members", "tournaments", "analytics"],
    memberCount: 5,
  },
  {
    id: "3",
    name: "Team",
    description: "Team members with limited access.",
    permissions: ["dashboard", "daily_activity", "members"],
    memberCount: 12,
  },
  {
    id: "4",
    name: "Organizer",
    description: "Manage tournaments and related members.",
    permissions: ["dashboard", "daily_activity", "members", "tournaments"],
    memberCount: 8,
  },
  {
    id: "5",
    name: "User",
    description: "Read-only access to dashboard and analytics.",
    permissions: ["dashboard", "analytics"],
    memberCount: 24,
  },
];
