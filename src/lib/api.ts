import type { Alert, Location, LocationDevice, Report, Device, CreateUserResponse, Ad, AdStats, LoginText, DailyLoginText } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.crowdcount.tech";

class CrowdCountAPI {
  private adminPassword: string = "";

  setAdminPassword(password: string) {
    this.adminPassword = password;
  }

  getAdminPassword(): string {
    return this.adminPassword;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || error.message || "Request failed");
    }

    return response.json();
  }

  // Authenticated POST request with password in body (not URL)
  private async authFetch<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    return this.fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        ...body,
        password: this.adminPassword,
      }),
    });
  }

  // Health & Status
  async ping(): Promise<{ status: string }> {
    return this.fetch("/ping");
  }

  async checkAdminPassword(password: string): Promise<boolean> {
    try {
      const result = await this.fetch<{ is_password_correct: boolean }>(
        "/check_admin_password",
        {
          method: "POST",
          body: JSON.stringify({ password }),
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
    return this.authFetch("/create_user", { count });
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
    });
  }

  async deleteUser(deviceId: string): Promise<{ status: string }> {
    return this.authFetch(`/delete_user`, { device_id: deviceId });
  }

  async setDeviceStatus(deviceId: string, status: "online" | "offline"): Promise<{ success: boolean }> {
    return this.authFetch("/admin/set_device_status", {
      device_id: deviceId,
      status,
    });
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
    });
  }

  async removeLocation(deviceId: string): Promise<{ status: string }> {
    return this.authFetch("/remove_location", { location_device: deviceId });
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

  async sendAlert(alert: Omit<Alert, "alert_id">): Promise<{ status: string; alert_id: string }> {
    return this.fetch("/send_alert", {
      method: "POST",
      body: JSON.stringify({ ...alert, password: this.adminPassword }),
    });
  }

  async expireAlert(alertId: string): Promise<{ status: string }> {
    return this.fetch("/expire_alert", {
      method: "POST",
      body: JSON.stringify({ alert_id: alertId, password: this.adminPassword }),
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
    });
  }

  async deleteReport(reportId: string): Promise<{ status: string }> {
    return this.fetch("/delete_report", {
      method: "POST",
      body: JSON.stringify({ report_id: reportId, password: this.adminPassword }),
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
    });
  }

  async deleteAd(adId: string): Promise<{ success: boolean }> {
    return this.fetch("/delete-ad", {
      method: "POST",
      body: JSON.stringify({
        password: this.adminPassword,
        ad_id: adId,
      }),
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
    });
  }

  async cleanupAds(daysOld: number = 30): Promise<{ deleted_count: number }> {
    return this.fetch("/cleanup-ads", {
      method: "POST",
      body: JSON.stringify({
        password: this.adminPassword,
        days_old: daysOld,
      }),
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
    });
  }

  async updateLoginText(textId: string, text: string): Promise<{ success: boolean }> {
    return this.fetch(`/login-texts/pool/${textId}`, {
      method: "PUT",
      body: JSON.stringify({
        password: this.adminPassword,
        text,
      }),
    });
  }

  async deleteLoginText(textId: string): Promise<{ success: boolean }> {
    return this.authFetch("/login-texts/pool/delete", { text_id: textId });
  }

  async toggleLoginTextActive(textId: string, active: boolean): Promise<{ success: boolean; active: boolean }> {
    return this.fetch(`/login-texts/pool/${textId}/toggle`, {
      method: "POST",
      body: JSON.stringify({
        password: this.adminPassword,
        active,
      }),
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
    });
  }

  async clearLoginTextOverride(date: string): Promise<{ success: boolean }> {
    return this.authFetch("/login-texts/override/clear", { date });
  }

  async getUpcomingLoginTexts(days: number = 7): Promise<DailyLoginText[]> {
    const result = await this.authFetch<{ texts: DailyLoginText[] }>("/login-texts/upcoming", { days });
    return result.texts || [];
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
    });
  }
}

export const api = new CrowdCountAPI();
