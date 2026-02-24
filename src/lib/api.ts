import type { Alert, Location, EnrichedLocation, Report, Device, CreateUserResponse, Ad, AdStats, LoginText, DailyLoginText, ResetSchedule } from "./types";
import { signRequest, generateIdempotencyKey } from "./crypto";

export const API_ENVIRONMENTS = {
  production: "https://api.crowdcount.tech",
  staging: "https://api-staging.crowdcount.tech",
} as const;

export type ApiEnv = keyof typeof API_ENVIRONMENTS;

const STORAGE_KEY = "crowdcount_api_env";

function loadApiEnv(): ApiEnv {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "production" || stored === "staging") return stored;
  }
  return "production"; // default
}

export function getApiEnv(): ApiEnv {
  return loadApiEnv();
}

export function setApiEnv(env: ApiEnv) {
  localStorage.setItem(STORAGE_KEY, env);
  window.location.reload();
}

interface SignedRequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  sign?: boolean;
  idempotent?: boolean;
}

class CrowdCountAPI {
  private adminPassword: string = "";
  private adminUsername: string = "";

  setAdminPassword(password: string) {
    this.adminPassword = password;
  }

  getAdminPassword(): string {
    return this.adminPassword;
  }

  setAdminCredentials(username: string, password: string) {
    this.adminUsername = username;
    this.adminPassword = password;
  }

  getAdminUsername(): string {
    return this.adminUsername;
  }

  private async fetch<T>(endpoint: string, options?: SignedRequestOptions): Promise<T> {
    const { sign, idempotent, headers: extraHeaders, ...fetchOptions } = options || {};
    const method = (fetchOptions.method as string) || "GET";
    const bodyStr = (fetchOptions.body as string) || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };

    // Sign request with Admin device ID
    if (sign && this.adminPassword) {
      const sigHeaders = await signRequest(
        "Admin",
        this.adminPassword,
        method,
        endpoint,
        bodyStr
      );
      Object.assign(headers, sigHeaders);
    }

    // Add idempotency key for mutating requests
    if (idempotent) {
      headers["Idempotency-Key"] = generateIdempotencyKey();
    }

    const url = `${API_ENVIRONMENTS[loadApiEnv()]}${endpoint}`;
    const response = await globalThis.fetch(url, {
      method,
      body: fetchOptions.body,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || error.message || "Request failed");
    }

    return response.json();
  }

  // Authenticated POST request with password in body (not URL)
  private async authFetch<T>(endpoint: string, body: Record<string, unknown> = {}, idempotent: boolean = false): Promise<T> {
    const authBody: Record<string, unknown> = {
      ...body,
      password: this.adminPassword,
    };
    if (this.adminUsername) {
      authBody.admin_username = this.adminUsername;
    }
    const bodyStr = JSON.stringify(authBody);
    return this.fetch(endpoint, {
      method: "POST",
      body: bodyStr,
      sign: true,
      idempotent,
    });
  }

  // Health & Status
  async ping(): Promise<{ message: string }> {
    return this.fetch("/ping", { sign: true });
  }

  async pingWithLatency(): Promise<{ message: string; latencyMs: number }> {
    const start = performance.now();
    const result = await this.fetch<{ message: string }>("/ping", { sign: true });
    const latencyMs = Math.round(performance.now() - start);
    return { ...result, latencyMs };
  }

  async checkAdminPassword(password: string): Promise<boolean> {
    try {
      const result = await this.fetch<{ is_password_correct: boolean }>(
        "/check_admin_password",
        {
          method: "POST",
          body: JSON.stringify({ password }),
          sign: true,
        }
      );
      return result.is_password_correct;
    } catch {
      return false;
    }
  }

  async checkAdminLogin(
    username: string,
    password: string
  ): Promise<{
    valid: boolean;
    permissions?: Record<string, number>;
  }> {
    try {
      const result = await this.fetch<{
        is_password_correct: boolean;
        username?: string;
        permissions?: Record<string, number>;
      }>("/check_admin_password", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        sign: true,
      });
      if (result.is_password_correct) {
        return {
          valid: true,
          permissions: result.permissions,
        };
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  // Dashboard Stats
  async getActiveCount(): Promise<number> {
    const result = await this.authFetch<{ active_count: number }>("/active_count");
    return result.active_count;
  }

  async getDeviceCount(status?: "online" | "offline"): Promise<number> {
    const body: Record<string, unknown> = {};
    if (status) {
      body.status = status;
    }
    const result = await this.authFetch<{ amount: number }>("/get_amount_of_devices", body);
    return result.amount;
  }

  async getTotalCount(): Promise<number> {
    const result = await this.fetch<{ total_count: number }>("/totalcount");
    return result.total_count;
  }

  // Devices
  async getAllDevices(): Promise<Device[]> {
    const result = await this.authFetch<{ devices: [string, string][] }>("/get_all_devices");
    return result.devices.map(([device_id, status]) => ({
      device_id,
      user_id: device_id,  // Compatibility
      status: status as "online" | "offline",
    }));
  }

  async createUsers(count: number = 1): Promise<CreateUserResponse> {
    return this.authFetch("/create_user", { count }, true);
  }

  async createDeviceWithCredentials(deviceId: string, devicePassword: string): Promise<{
    success: boolean;
    device_id: string;
    status: string;
    message: string;
  }> {
    return this.authFetch("/admin/create_device", {
      device_id: deviceId,
      device_password: devicePassword,
    }, true);
  }

  async deleteUser(deviceId: string): Promise<{ success: boolean; message: string }> {
    return this.authFetch("/delete_user", { device_id: deviceId }, true);
  }

  async setDeviceStatus(deviceId: string, status: "online" | "offline"): Promise<{ success: boolean }> {
    return this.authFetch("/admin/set_device_status", {
      device_id: deviceId,
      status,
    }, true);
  }

  // Locations
  private buildCredentials(deviceIds: string[]): { device_id: string; password: string }[] {
    return deviceIds.map((id) => ({ device_id: id, password: "" }));
  }

  private buildAdminAuth(): Record<string, string> {
    const auth: Record<string, string> = { admin_password: this.adminPassword };
    if (this.adminUsername) {
      auth.admin_username = this.adminUsername;
    }
    return auth;
  }

  // Returns { password, admin_username? } for direct fetch calls
  private buildPasswordAuth(): Record<string, string> {
    const auth: Record<string, string> = { password: this.adminPassword };
    if (this.adminUsername) {
      auth.admin_username = this.adminUsername;
    }
    return auth;
  }

  async getAllMapLocations(): Promise<Location[]> {
    const result = await this.fetch<{ locations: Location[] }>("/get_all_map_locations");
    return result.locations || [];
  }

  async getAllLocationsEnriched(): Promise<EnrichedLocation[]> {
    const result = await this.authFetch<{ locations: EnrichedLocation[] }>("/get_all_locations_enriched");
    return result.locations || [];
  }

  async addToDeviceCount(deviceId: string, delta: number): Promise<{ message: string; new_count: number }> {
    return this.authFetch("/admin/add_to_count", {
      device_id: deviceId,
      count_to_add: delta,
    }, true);
  }

  async subFromDeviceCount(deviceId: string, delta: number): Promise<{ message: string; new_count: number }> {
    return this.authFetch("/admin/sub_from_count", {
      device_id: deviceId,
      count_to_sub: delta,
    }, true);
  }

  async adjustLocationCount(locationId: string, delta: number): Promise<{ message: string; new_count: number }> {
    return this.authFetch("/admin/location/adjust_count", {
      location_id: locationId,
      delta,
    }, true);
  }

  async createLocation(
    deviceIds: string[],
    name: string,
    address: string,
    lat: number,
    lng: number,
    color: string,
    icon: string,
    overcrowdingLimit?: number,
    deviceLabels?: Record<string, string>,
  ): Promise<{ message: string; location_id: string }> {
    const body: Record<string, unknown> = {
      ...this.buildAdminAuth(),
      credentials: this.buildCredentials(deviceIds),
      name,
      on_map: true,
      address,
      latitude: lat,
      longitude: lng,
      color,
      icon,
    };
    if (overcrowdingLimit !== undefined) {
      body.overcrowding_limit = overcrowdingLimit;
    }
    if (deviceLabels) {
      body.device_labels = deviceLabels;
    }
    return this.fetch("/create_location", {
      method: "POST",
      body: JSON.stringify(body),
      sign: true,
      idempotent: true,
    });
  }

  async createLocationSimple(
    deviceIds: string[],
    name: string,
    deviceLabels?: Record<string, string>,
    overcrowdingLimit?: number,
  ): Promise<{ message: string; location_id: string }> {
    const body: Record<string, unknown> = {
      ...this.buildAdminAuth(),
      credentials: this.buildCredentials(deviceIds),
      name,
      on_map: false,
    };
    if (overcrowdingLimit !== undefined) {
      body.overcrowding_limit = overcrowdingLimit;
    }
    if (deviceLabels && Object.keys(deviceLabels).length > 0) {
      body.device_labels = deviceLabels;
    }
    return this.fetch("/create_location", {
      method: "POST",
      body: JSON.stringify(body),
      sign: true,
      idempotent: true,
    });
  }

  async updateLocation(
    locationId: string,
    deviceIds: string[],
    updates: Record<string, unknown>,
  ): Promise<{ message: string }> {
    return this.fetch("/update_location", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildAdminAuth(),
        credentials: this.buildCredentials(deviceIds),
        location_id: locationId,
        ...updates,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async replaceLocation(
    locationId: string,
    deviceIds: string[],
    deviceLabels?: Record<string, string>,
    metadataOverrides?: Record<string, unknown>,
  ): Promise<{ message: string; location_id: string }> {
    const body: Record<string, unknown> = {
      ...this.buildAdminAuth(),
      credentials: this.buildCredentials(deviceIds),
      location_id: locationId,
    };
    if (deviceLabels && Object.keys(deviceLabels).length > 0) {
      body.device_labels = deviceLabels;
    }
    if (metadataOverrides) {
      Object.assign(body, metadataOverrides);
    }
    return this.fetch("/replace_location", {
      method: "POST",
      body: JSON.stringify(body),
      sign: true,
      idempotent: true,
    });
  }

  async deleteLocation(locationId: string): Promise<{ message: string }> {
    return this.authFetch("/delete_location", {
      location_id: locationId,
    }, true);
  }

  async addDeviceToLocation(
    locationId: string,
    existingDeviceIds: string[],
    newDeviceId: string,
    newDevicePassword: string,
    label?: string,
  ): Promise<{ message: string }> {
    const body: Record<string, unknown> = {
      ...this.buildAdminAuth(),
      credentials: this.buildCredentials(existingDeviceIds),
      location_id: locationId,
      new_device_id: newDeviceId,
      new_device_password: newDevicePassword,
    };
    if (label) {
      body.label = label;
    }
    return this.fetch("/add_device_to_location", {
      method: "POST",
      body: JSON.stringify(body),
      sign: true,
      idempotent: true,
    });
  }

  async removeDeviceFromLocation(
    locationId: string,
    existingDeviceIds: string[],
    targetDeviceId: string,
  ): Promise<{ message: string }> {
    return this.fetch("/remove_device_from_location", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildAdminAuth(),
        credentials: this.buildCredentials(existingDeviceIds),
        location_id: locationId,
        target_device_id: targetDeviceId,
      }),
      sign: true,
      idempotent: true,
    });
  }

  // Alerts
  async getAllAlerts(): Promise<Alert[]> {
    const result = await this.authFetch<{ alerts: Alert[] }>("/get_all_alerts");
    return result.alerts || [];
  }

  async getActiveAlert(): Promise<Alert | null> {
    try {
      const result = await this.fetch<{ alert_info: Alert[] }>(
        "/get_active_alert"
      );
      return result.alert_info && result.alert_info.length > 0 ? result.alert_info[0] : null;
    } catch {
      return null;
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const result = await this.fetch<{ alert_info: Alert[] }>(
        "/get_active_alert"
      );
      return result.alert_info || [];
    } catch {
      return [];
    }
  }

  async sendAlert(alert: Omit<Alert, "alert_id">): Promise<{ status: string; alert_id: string }> {
    return this.fetch("/send_alert", {
      method: "POST",
      body: JSON.stringify({ ...alert, ...this.buildPasswordAuth() }),
      sign: true,
      idempotent: true,
    });
  }

  async expireAlert(alertId: string): Promise<{ message: string }> {
    return this.fetch("/expire_alert", {
      method: "POST",
      body: JSON.stringify({ alert_id: alertId, ...this.buildPasswordAuth() }),
      sign: true,
      idempotent: true,
    });
  }

  // Reports
  async getAllReports(): Promise<Report[]> {
    const result = await this.authFetch<{ reports: Report[] }>("/get_all_reports");
    return result.reports || [];
  }

  async getReportsByStatus(status: "pending" | "resolved"): Promise<Report[]> {
    const result = await this.authFetch<{ reports: Report[] }>("/get_reports_for_status", { status });
    return result.reports || [];
  }

  async resolveReport(reportId: string): Promise<{ message: string }> {
    return this.fetch("/resolve_report", {
      method: "POST",
      body: JSON.stringify({ report_id: reportId, ...this.buildPasswordAuth() }),
      sign: true,
      idempotent: true,
    });
  }

  async deleteReport(reportId: string): Promise<{ message: string }> {
    return this.fetch("/delete_report", {
      method: "POST",
      body: JSON.stringify({ report_id: reportId, ...this.buildPasswordAuth() }),
      sign: true,
      idempotent: true,
    });
  }

  // Overcrowding
  async getOvercrowding(deviceId: string, password: string): Promise<number | null> {
    try {
      const result = await this.fetch<{ overcrowding: number | string }>(
        "/get_overcrowding",
        {
          method: "POST",
          body: JSON.stringify({ device_name: deviceId, password }),
          sign: true,
        }
      );
      if (result.overcrowding === "N/A") return null;
      return Number(result.overcrowding);
    } catch {
      return null;
    }
  }

  async setOvercrowding(deviceId: string, value: number, password: string): Promise<{ message: string }> {
    return this.fetch("/add_overcrowding", {
      method: "POST",
      body: JSON.stringify({
        device_name: deviceId,
        overcrowding_value: value,
        password,
      }),
      sign: true,
      idempotent: true,
    });
  }

  // Ads
  async getAllAds(): Promise<Ad[]> {
    const result = await this.authFetch<{ ads: Ad[] }>("/get-ads");
    return result.ads || [];
  }

  async getAdsByStatus(status: Ad["status"]): Promise<Ad[]> {
    const result = await this.authFetch<{ ads: Ad[] }>("/get-ads", { status });
    return result.ads || [];
  }

  async getPendingAds(): Promise<Ad[]> {
    const result = await this.authFetch<{ ads: Ad[] }>("/get-pending-ads");
    return result.ads || [];
  }

  async getActiveAds(): Promise<Ad[]> {
    const result = await this.fetch<{ ads: Ad[] }>("/get-active-ads");
    return result.ads || [];
  }

  async getAd(adId: string): Promise<Ad | null> {
    try {
      const result = await this.fetch<{ ad: Ad }>(`/get-ad/${adId}`);
      return result.ad || null;
    } catch {
      return null;
    }
  }

  async approveAd(adId: string): Promise<{ success: boolean }> {
    return this.fetch("/approve-ad", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        ad_id: adId,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async rejectAd(adId: string, reason: string = ""): Promise<{ success: boolean }> {
    return this.fetch("/reject-ad", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        ad_id: adId,
        reason,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async deleteAd(adId: string): Promise<{ success: boolean }> {
    return this.fetch("/delete-ad", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        ad_id: adId,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async getAdStats(): Promise<AdStats> {
    const result = await this.authFetch<{ stats: AdStats }>("/ad-stats");
    return result.stats;
  }

  async expireAds(): Promise<{ expired_count: number }> {
    return this.fetch("/expire-ads", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
      }),
      sign: true,
      idempotent: true,
    });
  }

  async cleanupAds(daysOld: number = 30): Promise<{ deleted_count: number }> {
    return this.fetch("/cleanup-ads", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        days_old: daysOld,
      }),
      sign: true,
      idempotent: true,
    });
  }

  getAdImageUrl(imagePath: string | null): string | null {
    if (!imagePath) return null;
    // imagePath is stored as "ad_images/filename.jpg", extract just the filename
    const filename = imagePath.split("/").pop();
    return `${API_ENVIRONMENTS[loadApiEnv()]}/ad-images/${filename}`;
  }

  async createAdminAd(data: {
    title: string;
    description: string;
    location_id: string;
    duration_hours: number;
    cta_text?: string;
    cta_link_type?: "default" | "custom";
    cta_url?: string;
    image?: string;
  }): Promise<{ success: boolean; ad_id: string; expiration_date: string }> {
    return this.fetch("/create-admin-ad", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        ...data,
      }),
      sign: true,
      idempotent: true,
    });
  }

  // Login Texts
  async getLoginTextPool(): Promise<LoginText[]> {
    const result = await this.authFetch<{ texts: LoginText[]; count: number }>("/login-texts/pool/list");
    return result.texts || [];
  }

  async addLoginText(text: string): Promise<{ success: boolean; id: string }> {
    return this.fetch("/login-texts/pool", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        text,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async updateLoginText(textId: string, text: string): Promise<{ success: boolean }> {
    return this.fetch(`/login-texts/pool/${textId}`, {
      method: "PUT",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        text,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async deleteLoginText(textId: string): Promise<{ success: boolean }> {
    return this.authFetch("/login-texts/pool/delete", { text_id: textId }, true);
  }

  async toggleLoginTextActive(textId: string, active: boolean): Promise<{ success: boolean; active: boolean }> {
    return this.fetch(`/login-texts/pool/${textId}/toggle`, {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        active,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async getTodayLoginText(): Promise<DailyLoginText | null> {
    const result = await this.authFetch<{ date: string; info: DailyLoginText | null }>("/login-texts/today");
    return result.info;
  }

  async setLoginTextOverride(date: string, text: string): Promise<{ success: boolean }> {
    return this.fetch("/login-texts/override", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        date,
        text,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async clearLoginTextOverride(date: string): Promise<{ success: boolean }> {
    return this.authFetch("/login-texts/override/clear", { date }, true);
  }

  async getUpcomingLoginTexts(days: number = 7): Promise<DailyLoginText[]> {
    const result = await this.authFetch<{ texts: DailyLoginText[] }>("/login-texts/upcoming", { days });
    return result.texts || [];
  }

  // Data Reset
  async resetLocationAllData(locationId: string): Promise<{ success: boolean }> {
    return this.authFetch("/admin/reset_location_all_data", { location_id: locationId }, true);
  }

  // Device Versions
  async getDeviceVersions(): Promise<{
    versions: Record<string, { commit_hash: string; updated_at: number }>;
    target_commit_hash: string | null;
  }> {
    return this.authFetch("/get_all_device_versions");
  }

  async setTargetVersion(hash: string): Promise<{ status: string }> {
    return this.authFetch("/set_target_version", { target_commit_hash: hash });
  }

  // Promotion Pricing
  async getPromotionPricing(): Promise<{ price_per_hour: number; currency: string }> {
    return this.fetch("/get-promotion-pricing");
  }

  async setPromotionPricing(pricePerHour: number, currency: string = "USD"): Promise<{ success: boolean; price_per_hour: number; currency: string }> {
    return this.fetch("/set-promotion-pricing", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildPasswordAuth(),
        price_per_hour: pricePerHour,
        currency,
      }),
      sign: true,
      idempotent: true,
    });
  }

  // Reset Schedules
  async getResetSchedule(locationId: string, deviceIds: string[]): Promise<ResetSchedule | null> {
    const result = await this.fetch<ResetSchedule | { schedule: null }>("/get_reset_schedule", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildAdminAuth(),
        credentials: this.buildCredentials(deviceIds),
        location_id: locationId,
      }),
      sign: true,
    });
    if ("schedule" in result && result.schedule === null) return null;
    return result as ResetSchedule;
  }

  async setResetSchedule(locationId: string, deviceIds: string[], resetHour: number, resetMinute: number, timezone: string): Promise<ResetSchedule> {
    return this.fetch("/set_reset_schedule", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildAdminAuth(),
        credentials: this.buildCredentials(deviceIds),
        location_id: locationId,
        reset_hour: resetHour,
        reset_minute: resetMinute,
        timezone,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async deleteResetSchedule(locationId: string, deviceIds: string[]): Promise<{ message: string }> {
    return this.fetch("/delete_reset_schedule", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildAdminAuth(),
        credentials: this.buildCredentials(deviceIds),
        location_id: locationId,
      }),
      sign: true,
      idempotent: true,
    });
  }

  // Location History & Insights
  async getLocationAvailableDates(locationId: string, deviceIds: string[]): Promise<string[]> {
    const result = await this.fetch<{ dates: string[] }>("/get_location_available_dates", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildAdminAuth(),
        credentials: this.buildCredentials(deviceIds),
        location_id: locationId,
      }),
      sign: true,
    });
    return result.dates;
  }

  async getLocationInsightsBundle(
    locationId: string,
    deviceIds: string[],
    params: { date: string; date2?: string | null; week_date: string; year: number }
  ): Promise<InsightsBundleResponse> {
    const body: Record<string, unknown> = {
      ...this.buildAdminAuth(),
      credentials: this.buildCredentials(deviceIds),
      location_id: locationId,
      date: params.date,
      week_date: params.week_date,
      year: params.year,
      tz_offset_minutes: new Date().getTimezoneOffset() * -1,
    };
    if (params.date2) body.date2 = params.date2;
    return this.fetch("/get_location_insights_bundle", {
      method: "POST",
      body: JSON.stringify(body),
      sign: true,
    });
  }

  async getLocationHistoryBundle(
    locationId: string,
    deviceIds: string[],
    params: { date: string; date2?: string | null; week_date: string; year: number; data_type: "count" | "entries" }
  ): Promise<HistoryBundleResponse> {
    const body: Record<string, unknown> = {
      ...this.buildAdminAuth(),
      credentials: this.buildCredentials(deviceIds),
      location_id: locationId,
      date: params.date,
      week_date: params.week_date,
      year: params.year,
      data_type: params.data_type,
      tz_offset_minutes: new Date().getTimezoneOffset() * -1,
    };
    if (params.date2) body.date2 = params.date2;
    return this.fetch("/get_location_history_bundle", {
      method: "POST",
      body: JSON.stringify(body),
      sign: true,
    });
  }

  async getLocationDayDataDetailed(
    locationId: string,
    deviceIds: string[],
    params: { date: string; data_type: "count" | "entries" }
  ): Promise<{ data: Record<string, number>; average: Record<string, number> }> {
    return this.fetch("/get_location_day_data_detailed", {
      method: "POST",
      body: JSON.stringify({
        ...this.buildAdminAuth(),
        credentials: this.buildCredentials(deviceIds),
        location_id: locationId,
        date: params.date,
        data_type: params.data_type,
        tz_offset_minutes: new Date().getTimezoneOffset() * -1,
      }),
      sign: true,
    });
  }
}

export interface InsightsBundleResponse {
  day_view: Record<string, number>;
  average_day_view: Record<string, number>;
  entry_day_view: Record<string, number>;
  average_entry_day_view: Record<string, number>;
  day_view_2?: Record<string, number>;
  average_day_view_2?: Record<string, number>;
  entry_day_view_2?: Record<string, number>;
  average_entry_day_view_2?: Record<string, number>;
  week_view: Record<string, number>;
  average_week_view: Record<string, number>;
  entry_week_view: Record<string, number>;
  average_entry_week_view: Record<string, number>;
  year_view: Record<string, number>;
  average_year_view: Record<string, number> | null;
  entry_year_view: Record<string, number>;
  average_entry_year_view: Record<string, number> | null;
  dwell_time_view?: number | Record<string, never>;
}

export interface HistoryBundleResponse {
  day_view: Record<string, number>;
  average_day_view: Record<string, number>;
  day_view_2?: Record<string, number>;
  average_day_view_2?: Record<string, number>;
  week_view: Record<string, number>;
  average_week_view: Record<string, number>;
  year_view: Record<string, number>;
  average_year_view: Record<string, number> | null;
}

export const api = new CrowdCountAPI();
