import type { PropertyCode } from '../../base/constants/properties'

export interface Profile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  is_super_admin: boolean | null
  is_active: boolean | null
  department: string | null
  phone: string | null
  organization_name: string | null
  address: string | null
  person_type: string | null
  notes: string | null
  metadata: unknown
  created_at: string | null
  updated_at: string | null
}

export interface AdminUser extends Profile {
  propertyAccess?: UserPropertyAccess[]
}

export interface UserPropertyAccess {
  id: string
  user_id: string
  property_code: PropertyCode
  role: UserPropertyRole | null
}

export type UserPropertyRole = 'Owner' | 'Staff' | 'Manager' | 'RPM' | 'Asset'

export const USER_ROLES: UserPropertyRole[] = ['Owner', 'Staff', 'Manager', 'RPM', 'Asset']

export type Department = 'Leasing' | 'Maintenance' | 'Management' | 'Invest'

export const DEPARTMENTS: Department[] = ['Leasing', 'Maintenance', 'Management', 'Invest']
