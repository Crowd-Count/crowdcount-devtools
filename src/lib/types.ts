// API Response Types

export interface Device {
  device_id: string;
  user_id?: string;  // Deprecated: use device_id
  status: "online" | "offline";
  commit_hash?: string | null;
  is_updated?: boolean; // true = matches target, false = not updated (outdated or no version reported)
}

// Server returns devices as [device_id, label] tuples
export type LocationDevice = [string, string];

// Enriched endpoint returns [device_id, label, current_count]
export type EnrichedLocationDevice = [string, string, number];

export interface Location {
  location_id: string;
  location_name: string;
  on_map: number;  // 0 or 1
  location_address: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  location_color: string | null;
  location_icon: string | null;
  overcrowding_limit: number | null;
  is_auto: number;  // 0 or 1
  current_count: number;
  devices: LocationDevice[];  // [[device_id, label], ...]
  created_at: string;
  updated_at: string;
}

export interface EnrichedLocation extends Omit<Location, "devices"> {
  devices: EnrichedLocationDevice[];  // [[device_id, label, count], ...]
}

export interface Alert {
  alert_id: string;
  title: string;
  body: string;
  expires: string;
  alert_type: "info" | "warning" | "celebration" | "privacy" | "terms-of-use" | "leaf";
  min_app_version?: string | null;
  max_app_version?: string | null;
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
    device_id: string;
    user_id?: string;  // Deprecated: use device_id
    password: string;
  }[];
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  image_path: string | null;
  device_id: string;
  primary_device?: string; // The lead device for location matching (for grouped devices)
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
