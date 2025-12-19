import type { Alert, Location, Report, Device, CreateUserResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.crowdcount.tech";

class CrowdCountAPI {
  private adminPassword: string = "";

  setAdminPassword(password: string) {
    this.adminPassword = password;
    if (typeof window !== "undefined") {
      localStorage.setItem("crowdcount_admin_password", password);
    }
  }

  getAdminPassword(): string {
    if (!this.adminPassword && typeof window !== "undefined") {
      this.adminPassword = localStorage.getItem("crowdcount_admin_password") || "";
    }
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

  private withAuth(endpoint: string): string {
    const separator = endpoint.includes("?") ? "&" : "?";
    return `${endpoint}${separator}password=${encodeURIComponent(this.getAdminPassword())}`;
  }

  // Health & Status
  async ping(): Promise<{ status: string }> {
    return this.fetch("/ping");
  }

  async checkAdminPassword(password: string): Promise<boolean> {
    try {
      const result = await this.fetch<{ is_password_correct: boolean }>(
        `/check_admin_password?password=${encodeURIComponent(password)}`
      );
      return result.is_password_correct;
    } catch {
      return false;
    }
  }

  // Dashboard Stats
  async getActiveCount(): Promise<number> {
    const result = await this.fetch<{ active_count: number }>(
      this.withAuth("/active_count")
    );
    return result.active_count;
  }

  async getDeviceCount(status?: "online" | "offline"): Promise<number> {
    let endpoint = "/get_amount_of_devices";
    if (status) {
      endpoint += `?status=${status}`;
    }
    const result = await this.fetch<{ amount: number }>(this.withAuth(endpoint));
    return result.amount;
  }

  async getTotalCount(): Promise<number> {
    const result = await this.fetch<{ total_count: number }>("/totalcount");
    return result.total_count;
  }

  // Devices
  async getAllDevices(): Promise<Device[]> {
    const result = await this.fetch<{ devices: [string, string][] }>(
      this.withAuth("/get_all_devices")
    );
    return result.devices.map(([user_id, status]) => ({
      user_id,
      status: status as "online" | "offline",
    }));
  }

  async createUsers(count: number = 1): Promise<CreateUserResponse> {
    return this.fetch(this.withAuth("/create_user"), {
      method: "POST",
      body: JSON.stringify({ count }),
    });
  }

  async deleteUser(userId: string): Promise<{ status: string }> {
    return this.fetch(this.withAuth(`/delete_user?user_id=${userId}`), {
      method: "DELETE",
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

  async addLocation(location: Omit<Location, "location_current_count" | "location_comparison" | "location_overcrowding_count" | "device_breakdown">): Promise<{ status: string }> {
    return this.fetch(this.withAuth("/add_location"), {
      method: "POST",
      body: JSON.stringify(location),
    });
  }

  async removeLocation(deviceId: string): Promise<{ status: string }> {
    return this.fetch(this.withAuth("/remove_location"), {
      method: "POST",
      body: JSON.stringify({ location_device: deviceId }),
    });
  }

  // Alerts
  async getAllAlerts(): Promise<Alert[]> {
    const result = await this.fetch<{ alerts: Alert[] }>(
      this.withAuth("/get_all_alerts")
    );
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
    return this.fetch(this.withAuth("/send_alert"), {
      method: "POST",
      body: JSON.stringify(alert),
    });
  }

  async expireAlert(alertId: string): Promise<{ status: string }> {
    return this.fetch(this.withAuth("/expire_alert"), {
      method: "POST",
      body: JSON.stringify({ alert_id: alertId }),
    });
  }

  // Reports
  async getAllReports(): Promise<Report[]> {
    const result = await this.fetch<{ reports: Report[] }>(
      this.withAuth("/get_all_reports")
    );
    return result.reports || [];
  }

  async getReportsByStatus(status: "pending" | "resolved"): Promise<Report[]> {
    const result = await this.fetch<{ reports: Report[] }>(
      this.withAuth(`/get_reports_for_status?status=${status}`)
    );
    return result.reports || [];
  }

  async resolveReport(reportId: string): Promise<{ status: string }> {
    return this.fetch(this.withAuth("/resolve_report"), {
      method: "POST",
      body: JSON.stringify({ report_id: reportId }),
    });
  }

  async deleteReport(reportId: string): Promise<{ status: string }> {
    return this.fetch(this.withAuth("/delete_report"), {
      method: "POST",
      body: JSON.stringify({ report_id: reportId }),
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
}

export const api = new CrowdCountAPI();
