// API Response Types

export interface Device {
  device_id: string;
  user_id?: string;  // Deprecated: use device_id
  status: "online" | "offline";
  commit_hash?: string | null;
  is_updated?: boolean; // true = matches target, false = not updated (outdated or no version reported)
}

// Rich per-device health with the two liveness signals kept distinct:
//  - heartbeat_* : direct device->API heartbeat ("powered on & reaching the cloud")
//  - stream_status : counter-server's last-reported streaming flag ("RTSP being received")
// `online` is the recency-based liveness (fresh heartbeat OR fresh version report).
export interface DeviceHealth {
  device_id: string;
  online: boolean;
  heartbeat_last_seen: number | null;
  heartbeat_age_seconds: number | null;
  version_updated_at: number | null;
  version_age_seconds: number | null;
  commit_hash: string | null;
  stream_status: "online" | "offline" | null;
  stream_updated_at: number | null;
  stream_age_seconds: number | null;
  is_updated?: boolean;
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
  is_closed?: boolean;
  has_pos?: boolean;
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
  success: boolean;
  users: {
    user_id: string;
    device_id?: string;  // not returned by server
    password: string;
    status?: string;
  }[];
  errors?: string[];
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  image_path: string | null;
  location_id: string;
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

export interface ResetSchedule {
  id: string;
  location_id: string;
  reset_hour: number;
  reset_minute: number;
  timezone: string;
  last_reset_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClosingTimeDay {
  day_of_week: number;
  close_hour: number;
  close_minute: number;
  open_hour: number;
  open_minute: number;
}

export interface AdminAccount {
  username: string;
  permissions: Record<string, number>;
  created_at?: number;
  updated_at?: number;
  source: "database" | "env_var";
}

export interface ClosingTimeSchedule {
  id: string;
  location_id: string;
  timezone: string;
  last_close_date: string | null;
  last_open_date: string | null;
  created_at: string;
  updated_at: string;
  days: ClosingTimeDay[];
}
