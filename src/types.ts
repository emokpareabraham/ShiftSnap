export interface Organization {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface OrganizationSettings {
  organization_id: number;
  labels: {
    staff: string;
    clockIn: string;
    clockOut: string;
    location: string;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
  };
  features: {
    photoRequired: boolean;
    geofencing: boolean;
    pinLogin: boolean;
  };
}

export interface Location {
  id: number;
  organization_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface User {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff';
  pin: string;
  status: 'in' | 'out';
  active: number;
}

export interface Shift {
  id: number;
  organization_id: number;
  employee_id: number;
  employee_name: string;
  location_id: number | null;
  type: 'in' | 'out';
  timestamp: string;
  photo: string;
  latitude: number;
  longitude: number;
}

export interface Invite {
  id: number;
  organization_id: number;
  email: string;
  role: 'admin';
  token: string;
  expires_at: string;
  accepted_at: string | null;
}
