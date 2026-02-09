import type { Alert, Location, LocationDevice, Report, Device, CreateUserResponse, Ad, AdStats, LoginText, DailyLoginText } from "./types";
import { signRequest, generateIdempotencyKey } from "./crypto";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.crowdcount.tech";

interface SignedRequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  sign?: boolean;
  idempotent?: boolean;
}

class CrowdCountAPI {
  private adminPassword: string = "";

  setAdminPassword(password: string) {
    this.adminPassword = password;
  }

  getAdminPassword(): string {
    return this.adminPassword;
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

    const url = `${API_BASE}${endpoint}`;
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
    const bodyStr = JSON.stringify({
      ...body,
      password: this.adminPassword,
    });
    return this.fetch(endpoint, {
      method: "POST",
      body: bodyStr,
      sign: true,
      idempotent,
    });
  }

  // Health & Status
  async ping(): Promise<{ status: string }> {
    return this.fetch("/ping", { sign: true });
  }

  async pingWithLatency(): Promise<{ status: string; latencyMs: number }> {
    const start = performance.now();
    const result = await this.fetch<{ status: string }>("/ping", { sign: true });
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

  async deleteUser(deviceId: string): Promise<{ status: string }> {
    return this.authFetch("/delete_user", { device_id: deviceId }, true);
  }

  async setDeviceStatus(deviceId: string, status: "online" | "offline"): Promise<{ success: boolean }> {
    return this.authFetch("/admin/set_device_status", {
      device_id: deviceId,
      status,
    }, true);
  }

  // Locations
  async getAllLocations(): Promise<Location[]> {
    const result = await this.fetch<{ locations: Location[] }>("/get_all_locations");
    return result.locations || [];
  }

  async getAllLocationsWithData(): Promise<Location[]> {
    const result = await this.fetch<{ locations: Location[] }>(
      "/get_all_location_data_with_extra"
    );
    return result.locations || [];
  }

  async addLocation(
    location: Omit<Location, "location_current_count" | "location_comparison" | "location_overcrowding_count" | "device_breakdown">,
    additionalDevices?: LocationDevice[]
  ): Promise<{ status: string }> {
    const body: Record<string, unknown> = {
      password: this.adminPassword,
      name: location.location_name,
      address: location.location_address,
      device: location.location_device,
      latitude: location.location_latitude,
      longitude: location.location_longitude,
      color: location.location_color,
      icon: location.location_icon,
    };

    if (additionalDevices && additionalDevices.length > 0) {
      body.devices = additionalDevices;
    }

    return this.fetch("/add_location", {
      method: "POST",
      body: JSON.stringify(body),
      sign: true,
      idempotent: true,
    });
  }

  async removeLocation(deviceId: string): Promise<{ status: string }> {
    return this.authFetch("/remove_location", { location_device: deviceId }, true);
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
      body: JSON.stringify({ ...alert, password: this.adminPassword }),
      sign: true,
      idempotent: true,
    });
  }

  async expireAlert(alertId: string): Promise<{ status: string }> {
    return this.fetch("/expire_alert", {
      method: "POST",
      body: JSON.stringify({ alert_id: alertId, password: this.adminPassword }),
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

  async resolveReport(reportId: string): Promise<{ status: string }> {
    return this.fetch("/resolve_report", {
      method: "POST",
      body: JSON.stringify({ report_id: reportId, password: this.adminPassword }),
      sign: true,
      idempotent: true,
    });
  }

  async deleteReport(reportId: string): Promise<{ status: string }> {
    return this.fetch("/delete_report", {
      method: "POST",
      body: JSON.stringify({ report_id: reportId, password: this.adminPassword }),
      sign: true,
      idempotent: true,
    });
  }

  // Overcrowding
  async getOvercrowding(deviceId: string): Promise<number | null> {
    try {
      const result = await this.fetch<{ overcrowding_value: number | string }>(
        `/get_overcrowding?device_name=${deviceId}`
      );
      if (result.overcrowding_value === "N/A") return null;
      return Number(result.overcrowding_value);
    } catch {
      return null;
    }
  }

  async setOvercrowding(deviceId: string, value: number, password: string): Promise<{ status: string }> {
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
        password: this.adminPassword,
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
        password: this.adminPassword,
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
        password: this.adminPassword,
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
        password: this.adminPassword,
      }),
      sign: true,
      idempotent: true,
    });
  }

  async cleanupAds(daysOld: number = 30): Promise<{ deleted_count: number }> {
    return this.fetch("/cleanup-ads", {
      method: "POST",
      body: JSON.stringify({
        password: this.adminPassword,
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
    return `${API_BASE}/ad-images/${filename}`;
  }

  async createAdminAd(data: {
    title: string;
    description: string;
    device_id: string;
    duration_hours: number;
    cta_text?: string;
    cta_link_type?: "default" | "custom";
    cta_url?: string;
    image?: string;
  }): Promise<{ success: boolean; ad_id: string; expiration_date: string }> {
    return this.fetch("/create-admin-ad", {
      method: "POST",
      body: JSON.stringify({
        password: this.adminPassword,
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
        password: this.adminPassword,
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
        password: this.adminPassword,
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
        password: this.adminPassword,
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
        password: this.adminPassword,
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
        password: this.adminPassword,
        price_per_hour: pricePerHour,
        currency,
      }),
      sign: true,
      idempotent: true,
    });
  }
}

export const api = new CrowdCountAPI();
