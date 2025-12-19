// API Response Types

export interface Device {
  user_id: string;
  status: "online" | "offline";
}

export interface Location {
  location_name: string;
  location_address: string;
  location_device: string;
  location_latitude: number;
  location_longitude: number;
  location_color: string;
  location_icon: string;
  location_current_count?: number;
  location_comparison?: string;
  location_overcrowding_count?: number | string;
  device_breakdown?: {
    device_id: string;
    device_label: string;
    count: number;
    overcrowding: number | null;
  }[];
}

export interface Alert {
  alert_id: string;
  title: string;
  body: string;
  expires: string;
  alert_type: "info" | "warning" | "celebration" | "privacy" | "terms-of-use" | "leaf";
}

export interface Report {
  report_id: string;
  user_name: string;
  user_email: string;
  location: string;
  report_content: string;
  other: string;
  date: string;
  report_status: "pending" | "resolved";
}

export interface DashboardStats {
  activeApps: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  totalCount: number;
  activeAlert: Alert | null;
  pendingReports: number;
  locationCount: number;
}

export interface DeviceListResponse {
  devices: [string, string][];
  total?: number;
  online?: number;
  offline?: number;
}

export interface CreateUserResponse {
  status: string;
  users: {
    user_id: string;
    password: string;
  }[];
}
