"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HistoryBundleResponse } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Timezone helpers (same logic as counter-manager lib/timezone.ts) ──

function formatUTCDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateAsLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatLocalDate(): string {
  return formatDateAsLocal(new Date());
}

interface LocalDayUTCBounds {
  utcDate1: string;
  utcDate2: string;
  utcMinutesAtMidnight: number;
}

function getLocalDayUTCBounds(dateStr?: string): LocalDayUTCBounds {
  let localMidnight: Date;
  let localNextMidnight: Date;
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    localMidnight = new Date(y, m - 1, d, 0, 0, 0);
    localNextMidnight = new Date(y, m - 1, d + 1, 0, 0, 0);
  } else {
    const now = new Date();
    localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    localNextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  }
  return {
    utcDate1: formatUTCDate(localMidnight),
    utcDate2: formatUTCDate(localNextMidnight),
    utcMinutesAtMidnight: localMidnight.getUTCHours() * 60 + localMidnight.getUTCMinutes(),
  };
}

function utcDatesToLocalDates(utcDates: string[]): string[] {
  const localDateSet = new Set<string>();
  for (const utcDateStr of utcDates) {
    const [y, m, d] = utcDateStr.split("-").map(Number);
    const utcDayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    localDateSet.add(formatDateAsLocal(utcDayStart));
    const utcDayEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 0));
    localDateSet.add(formatDateAsLocal(utcDayEnd));
  }
  const today = formatLocalDate();
  return Array.from(localDateSet).filter((d) => d <= today).sort();
}

function shiftDayDataToLocal(
  date1Data: Record<string, number>,
  date2Data: Record<string, number>,
  utcMinutesAtMidnight: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (let localHour = 0; localHour < 24; localHour++) {
    const totalUtcMinutes = localHour * 60 + utcMinutesAtMidnight;
    const utcHour = Math.floor(totalUtcMinutes / 60) % 24;
    const isDate2 = totalUtcMinutes >= 24 * 60;
    const data = isDate2 ? date2Data : date1Data;
    result[localHour.toString()] = data[utcHour.toString()] || 0;
  }
  return result;
}

function getLocalDayOfWeekIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function isDateInCurrentLocalWeek(dateStr: string): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return target >= monday && target <= sunday;
}

// ── Chart data builders (same logic as counter-manager lib/dataFetchers.ts) ──

interface ChartData {
  label: string;
  value: number;
  average?: number;
}

function buildDayChart(data: Record<string, number>, avgData: Record<string, number>): ChartData[] {
  const chart: ChartData[] = [];
  for (let h = 0; h < 24; h++) {
    const val = Math.round(data[h.toString()] || 0);
    const avg = Math.round(avgData[h.toString()] || 0);
    chart.push({ label: `${h}:00`, value: val < 1 ? 0 : val, average: avg < 1 ? 0 : avg });
  }
  return chart;
}

function buildWeekChart(
  data: Record<string, number>,
  avgData: Record<string, number>,
  maxDayIndex?: number
): ChartData[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days.map((day, index) => {
    let val = Math.round(data[day] || 0);
    const avg = Math.round(avgData[day] || 0);
    if (maxDayIndex !== undefined && index > maxDayIndex) val = 0;
    return { label: day.substring(0, 3), value: val < 1 ? 0 : val, average: avg < 1 ? 0 : avg };
  });
}

function buildYearChart(data: Record<string, number>, avgData: Record<string, number> | null): ChartData[] {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months.map((month) => {
    const val = Math.round(data[month] || 0);
    const avg = Math.round((avgData?.[month]) || 0);
    return { label: month.substring(0, 3), value: val < 1 ? 0 : val, average: avg < 1 ? 0 : avg };
  });
}

function processHistoryBundle(
  bundle: HistoryBundleResponse,
  date: string,
  weekDate: string
): { dayData: ChartData[]; weekData: ChartData[]; yearData: ChartData[] } {
  const { utcDate1, utcDate2, utcMinutesAtMidnight } = getLocalDayUTCBounds(date);
  const needsSecondDate = utcDate1 !== utcDate2;

  const dayD2 = needsSecondDate ? (bundle.day_view_2 ?? {}) : {};
  const dayAvg2 = needsSecondDate ? (bundle.average_day_view_2 ?? {}) : {};

  const shiftedDay = shiftDayDataToLocal(bundle.day_view, dayD2, utcMinutesAtMidnight);
  const shiftedAvgDay = shiftDayDataToLocal(bundle.average_day_view, dayAvg2, utcMinutesAtMidnight);

  const maxDayIndex = isDateInCurrentLocalWeek(weekDate) ? getLocalDayOfWeekIndex() : undefined;

  return {
    dayData: buildDayChart(shiftedDay, shiftedAvgDay),
    weekData: buildWeekChart(bundle.week_view, bundle.average_week_view, maxDayIndex),
    yearData: buildYearChart(bundle.year_view, bundle.average_year_view),
  };
}

// ── HistoryChart (inline Recharts component) ──

function HistoryChart({ data, dataType }: { data: ChartData[]; dataType: string }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }
  const hasAverage = data.some((d) => d.average !== undefined && d.average > 0);
  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.average || 0)));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
          <YAxis
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            domain={[0, Math.ceil(maxValue * 1.1)]}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value: number | undefined) => Math.round(value ?? 0)}
          />
          {hasAverage && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
            />
          )}
          <Bar dataKey="value" name={dataType === "entries" ? "Entries" : "Count"} fill="#3b82f6" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fillOpacity={i % 2 === 0 ? 1.0 : 0.85} />)}
          </Bar>
          {hasAverage && (
            <Bar dataKey="average" name="Average" fill="#f97316" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fillOpacity={i % 2 === 0 ? 0.85 : 0.70} />)}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── CSV download ──

function downloadCsv(data: ChartData[], filename: string, dataType: string) {
  const header = `Label,${dataType === "entries" ? "Entries" : "Count"},Average`;
  const rows = data.map((d) => `${d.label},${d.value},${d.average ?? ""}`);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadDetailedCsv(data: Record<string, number>, average: Record<string, number>, filename: string, dataType: string) {
  const header = `Time,${dataType === "entries" ? "Entries" : "Count"},Average`;
  const keys = Object.keys(data).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const rows = keys.map((k) => `${k},${data[k] || 0},${average[k] || 0}`);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Helpers ──

function formatDateForDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString();
}

function getAvailableYears(dates: string[]): string[] {
  const years = new Set<string>();
  for (const d of dates) {
    years.add(d.split("-")[0]);
  }
  const currentYear = new Date().getFullYear().toString();
  years.add(currentYear);
  return Array.from(years).sort().reverse();
}

// ── Main Component ──

interface LocationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationName: string;
  deviceIds: string[];
}

export function LocationHistoryDialog({
  open,
  onOpenChange,
  locationId,
  locationName,
  deviceIds,
}: LocationHistoryDialogProps) {
  const [dataType, setDataType] = useState<"population" | "entries">("entries");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWeekDate, setSelectedWeekDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isDayDownloading, setIsDayDownloading] = useState(false);

  // Fetch available dates
  const { data: availableDates = [], isLoading: isLoadingDates } = useQuery({
    queryKey: ["locationAvailableDates", locationId],
    queryFn: async () => {
      const utcDates = await api.getLocationAvailableDates(locationId, deviceIds);
      return utcDatesToLocalDates(utcDates);
    },
    enabled: open && deviceIds.length > 0,
  });

  // Set initial dates once available
  const latestDate = availableDates.length > 0 ? availableDates[availableDates.length - 1] : "";
  const effectiveDate = selectedDate && availableDates.includes(selectedDate) ? selectedDate : latestDate;
  const effectiveWeekDate = selectedWeekDate && availableDates.includes(selectedWeekDate) ? selectedWeekDate : latestDate;
  const availableYears = getAvailableYears(availableDates);
  const effectiveYear = availableYears.includes(selectedYear) ? selectedYear : availableYears[0] || new Date().getFullYear().toString();

  // Fetch history bundle
  const { data: historyCharts, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["locationHistoryBundle", locationId, effectiveDate, effectiveWeekDate, effectiveYear, dataType],
    queryFn: async () => {
      const { utcDate1, utcDate2 } = getLocalDayUTCBounds(effectiveDate);
      const needsSecondDate = utcDate1 !== utcDate2;
      const bundle = await api.getLocationHistoryBundle(locationId, deviceIds, {
        date: utcDate1,
        date2: needsSecondDate ? utcDate2 : null,
        week_date: effectiveWeekDate,
        year: parseInt(effectiveYear, 10),
        data_type: dataType === "entries" ? "entries" : "count",
      });
      return processHistoryBundle(bundle, effectiveDate, effectiveWeekDate);
    },
    enabled: open && !!effectiveDate && deviceIds.length > 0,
  });

  const dayData = historyCharts?.dayData ?? [];
  const weekData = historyCharts?.weekData ?? [];
  const yearData = historyCharts?.yearData ?? [];
  const dataLabel = dataType === "entries" ? "Entries" : "Count";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>History - {locationName || "Unnamed"}</DialogTitle>
        </DialogHeader>

        {isLoadingDates ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : availableDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No historical data available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Tabs value={dataType} onValueChange={(v) => setDataType(v as "population" | "entries")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entries">Entries</TabsTrigger>
                <TabsTrigger value="population">Population</TabsTrigger>
              </TabsList>

              <p className="text-xs text-muted-foreground text-center px-4 mt-3">
                {dataType === "population"
                  ? "Population shows the number of people present at each point in time."
                  : "Entries shows the total number of people who entered during each period."}
              </p>

              {["population", "entries"].map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
                  {/* Day Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Daily {dataLabel}</CardTitle>
                          <CardDescription>Hourly count breakdown</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={effectiveDate} onValueChange={setSelectedDate}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDates.map((date) => (
                                <SelectItem key={date} value={date}>
                                  {formatDateForDisplay(date)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={isLoadingHistory || isDayDownloading || dayData.length === 0}
                            onClick={async () => {
                              setIsDayDownloading(true);
                              try {
                                const { utcDate1 } = getLocalDayUTCBounds(effectiveDate);
                                const detailed = await api.getLocationDayDataDetailed(locationId, deviceIds, {
                                  date: utcDate1,
                                  data_type: dataType === "entries" ? "entries" : "count",
                                });
                                downloadDetailedCsv(
                                  detailed.data,
                                  detailed.average,
                                  `${locationName}-day-${effectiveDate}-${dataType}`,
                                  dataType
                                );
                              } catch {
                                downloadCsv(dayData, `${locationName}-day-${effectiveDate}-${dataType}`, dataType);
                              } finally {
                                setIsDayDownloading(false);
                              }
                            }}
                          >
                            {isDayDownloading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <HistoryChart data={dayData} dataType={dataType} />
                      )}
                    </CardContent>
                  </Card>

                  {/* Week Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Weekly {dataLabel}</CardTitle>
                          <CardDescription>Daily count breakdown</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={effectiveWeekDate} onValueChange={setSelectedWeekDate}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDates.map((date) => (
                                <SelectItem key={date} value={date}>
                                  Week of {formatDateForDisplay(date)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={isLoadingHistory || weekData.length === 0}
                            onClick={() => downloadCsv(weekData, `${locationName}-week-${effectiveWeekDate}-${dataType}`, dataType)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <HistoryChart data={weekData} dataType={dataType} />
                      )}
                    </CardContent>
                  </Card>

                  {/* Year Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Yearly {dataLabel}</CardTitle>
                          <CardDescription>Monthly count breakdown</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={effectiveYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableYears.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={isLoadingHistory || yearData.length === 0}
                            onClick={() => downloadCsv(yearData, `${locationName}-year-${effectiveYear}-${dataType}`, dataType)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <HistoryChart data={yearData} dataType={dataType} />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
