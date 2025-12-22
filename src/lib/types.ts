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

export interface Ad {
  id: string;
  title: string;
  description: string;
  image_path: string | null;
  device_id: string;
  duration_hours: number;
  total_price: number;
  cta_text: string;
  cta_link_type: "default" | "custom";
  cta_url: string | null;
  payment_intent_id: string;
  status: "pending_review" | "approved" | "rejected" | "expired";
  rejection_reason: string | null;
  created_at: string;
  expiration_date: string;
  approved_at: string | null;
  submitted_at: string;
  click_count: number;
}

export interface AdStats {
  total: number;
  pending_review: number;
  approved: number;
  rejected: number;
  expired: number;
  active: number;
  total_revenue: number;
  total_clicks: number;
}

export interface LoginText {
  id: string;
  text: string;
  active: boolean;
  created_at: string;
}

export interface DailyLoginText {
  date: string;
  text: string | null;
  text_id: string | null;
  is_override: boolean;
  selected_at: string | null;
}
