/**
 * Authentication and Authorization Types
 *
 * Shared types and utilities for role-based access control.
 */

/**
 * User roles in the system.
 * Hierarchy: fan < creator < admin
 */
export type Role = 'fan' | 'creator' | 'admin';

/**
 * Role hierarchy for comparison and validation.
 * Higher numbers indicate higher privilege levels.
 */
export const ROLE_ORDER: Record<Role, number> = {
  fan: 0,
  creator: 1,
  admin: 2,
} as const;

/**
 * Type guard to check if a value is a valid Role.
 *
 * @param value - Value to check
 * @returns True if value is a valid Role
 */
export function isValidRole(value: unknown): value is Role {
  return (
    typeof value === 'string' &&
    (value === 'fan' || value === 'creator' || value === 'admin')
  );
}

/**
 * Get the privilege level of a role.
 *
 * @param role - Role to get level for
 * @returns Numeric privilege level (0-2)
 */
export function getRoleLevel(role: Role | string): number {
  if (!isValidRole(role)) {
    return ROLE_ORDER.fan; // Default to lowest privilege
  }
  return ROLE_ORDER[role];
}

/**
 * Check if a role is higher or equal in privilege to another role.
 *
 * @param role - Role to check
 * @param minimumRole - Minimum required role
 * @returns True if role meets or exceeds minimum
 */
export function hasRoleLevel(role: Role | string, minimumRole: Role): boolean {
  return getRoleLevel(role) >= getRoleLevel(minimumRole);
}

/**
 * Check if a role upgrade is allowed (same level or higher).
 *
 * @param currentRole - Current user role
 * @param newRole - Proposed new role
 * @returns True if upgrade is allowed
 */
export function isRoleUpgrade(currentRole: Role | string, newRole: Role | string): boolean {
  return getRoleLevel(newRole) >= getRoleLevel(currentRole);
}

/**
 * Check if a role change is a downgrade.
 *
 * @param currentRole - Current user role
 * @param newRole - Proposed new role
 * @returns True if change is a downgrade
 */
export function isRoleDowngrade(currentRole: Role | string, newRole: Role | string): boolean {
  return getRoleLevel(newRole) < getRoleLevel(currentRole);
}

/**
 * Safely parse a role from unknown input with fallback.
 *
 * @param value - Value to parse
 * @param fallback - Fallback role if parsing fails (default: 'fan')
 * @returns Valid role or fallback
 */
export function parseRole(value: unknown, fallback: Role = 'fan'): Role {
  if (isValidRole(value)) {
    return value;
  }
  return fallback;
}
