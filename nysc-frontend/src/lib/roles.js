/**
 * Centralized role checking utilities.
 * Use this everywhere instead of hardcoding role checks.
 */

// All roles that should have access to the admin dashboard
export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'logistics_head',
  'technical_head',
  'hospitality_head',
  'media_head',
  'website_head',
];

// Check if a role has admin dashboard access
export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

// Check if a role is a department head (not super_admin or regular admin)
export function isDepartmentHead(role) {
  return role?.endsWith('_head') || false;
}

// Get the display name for a role
export function getRoleDisplayName(role) {
  const displayNames = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    logistics_head: 'Head of Logistics',
    technical_head: 'Head of Technical',
    hospitality_head: 'Head of Hospitality',
    media_head: 'Head of Media',
    website_head: 'Head of Website',
    volunteer: 'Volunteer',
    presenter: 'Presenter',
    delegate: 'Delegate',
  };
  return displayNames[role] || role?.replace('_', ' ') || 'Unknown';
}
