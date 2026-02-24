"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InsightsBundleResponse } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3,
  UserPlus,
  Clock,
  Sunrise,
  ArrowLeftRight,
  Calendar,
  CalendarClock,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  Timer,
} from "lucide-react";

// ── Timezone helpers ──

function formatUTCDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLocalDayUTCBounds() {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const localNextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  return {
    utcDate1: formatUTCDate(localMidnight),
    utcDate2: formatUTCDate(localNextMidnight),
    utcMinutesAtMidnight: localMidnight.getUTCHours() * 60 + localMidnight.getUTCMinutes(),
  };
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

// ── Insights calculation functions (same as counter-manager lib/insights.ts) ──

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function formatHourRange(start: number, end: number): string {
  return `${formatHour(start)} - ${formatHour(end)}`;
}

function formatPercentage(value: number): string {
  const rounded = Math.round(value);
  return rounded >= 0 ? `+${rounded}%` : `${rounded}%`;
}

type TrendDirection = "up" | "down" | "neutral";

function trendDirection(percentage: number): TrendDirection {
  if (percentage > 1) return "up";
  if (percentage < -1) return "down";
  return "neutral";
}

function vsAveragePercentage(current: number, average: number): number {
  if (average === 0) return 0;
  return ((current - average) / average) * 100;
}

function fairHistoricalAvg(
  currentData: Record<string, number>,
  avgData: Record<string, number>,
  avgFn: (data: Record<string, number>) => number
): number {
  const keysWithData = Object.keys(currentData).filter((k) => (currentData[k] || 0) > 0);
  if (keysWithData.length === 0) return avgFn(avgData);
  const filtered: Record<string, number> = {};
  for (const k of keysWithData) filtered[k] = avgData[k] || 0;
  return avgFn(filtered);
}

function nonZeroValues(data: Record<string, number>): number[] {
  return Object.values(data).filter((v) => v > 0);
}

function sumValues(data: Record<string, number>): number {
  return Object.values(data).reduce((sum, v) => sum + v, 0);
}

function avgNonZero(data: Record<string, number>): number {
  const vals = nonZeroValues(data);
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function formatDwellTime(minutes: number): string {
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

// Today
function averageDayOccupancy(dayData: Record<string, number>): number { return avgNonZero(dayData); }

function peakOccupancy(dayData: Record<string, number>): { hour: number; count: number } {
  let maxHour = 0, maxCount = 0;
  for (let h = 0; h < 24; h++) {
    const val = dayData[h.toString()] || 0;
    if (val > maxCount) { maxCount = val; maxHour = h; }
  }
  return { hour: maxHour, count: maxCount };
}

function bestWindow(dayData: Record<string, number>, mode: "max" | "min") {
  let bestStart = 0;
  let bestAvg = mode === "max" ? -Infinity : Infinity;
  for (let start = 0; start <= 21; start++) {
    let sum = 0;
    for (let i = 0; i < 3; i++) sum += dayData[(start + i).toString()] || 0;
    const avg = sum / 3;
    if (mode === "max" ? avg > bestAvg : avg < bestAvg) { bestAvg = avg; bestStart = start; }
  }
  return { startHour: bestStart, endHour: bestStart + 3, avg: bestAvg === -Infinity || bestAvg === Infinity ? 0 : bestAvg };
}

function busiestPeriod(dayData: Record<string, number>) { return bestWindow(dayData, "max"); }
function slowestPeriod(dayData: Record<string, number>) { return bestWindow(dayData, "min"); }

function morningAfternoonComparison(dayData: Record<string, number>) {
  let morningSum = 0, morningCount = 0, afternoonSum = 0, afternoonCount = 0;
  for (let h = 6; h < 12; h++) { const val = dayData[h.toString()] || 0; if (val > 0) { morningSum += val; morningCount++; } }
  for (let h = 12; h < 18; h++) { const val = dayData[h.toString()] || 0; if (val > 0) { afternoonSum += val; afternoonCount++; } }
  return {
    morningAvg: morningCount > 0 ? morningSum / morningCount : 0,
    afternoonAvg: afternoonCount > 0 ? afternoonSum / afternoonCount : 0,
  };
}

function totalDayEntries(entryData: Record<string, number>): number { return sumValues(entryData); }
function avgHourlyEntries(entryData: Record<string, number>): number { return avgNonZero(entryData); }
function peakEntryHour(entryData: Record<string, number>) { return peakOccupancy(entryData); }

function busiestEntryPeriod(entryData: Record<string, number>) {
  let bestStart = 0, bestTotal = 0;
  for (let start = 0; start <= 21; start++) {
    let sum = 0;
    for (let i = 0; i < 3; i++) sum += entryData[(start + i).toString()] || 0;
    if (sum > bestTotal) { bestTotal = sum; bestStart = start; }
  }
  return { startHour: bestStart, endHour: bestStart + 3, total: bestTotal };
}

function morningAfternoonEntries(entryData: Record<string, number>) {
  let morning = 0, afternoon = 0;
  for (let h = 6; h < 12; h++) morning += entryData[h.toString()] || 0;
  for (let h = 12; h < 18; h++) afternoon += entryData[h.toString()] || 0;
  return { morning, afternoon };
}

// Week
function averageWeekOccupancy(weekData: Record<string, number>): number { return avgNonZero(weekData); }

function bestDay(weekData: Record<string, number>, mode: "max" | "min") {
  let bestDayName = "", bestVal = mode === "max" ? -Infinity : Infinity;
  for (const day of DAYS_OF_WEEK) {
    const val = weekData[day] || 0;
    if (val === 0 && mode === "min") continue;
    if (mode === "max" ? val > bestVal : val < bestVal) { bestVal = val; bestDayName = day; }
  }
  return { day: bestDayName || DAYS_OF_WEEK[0], avg: bestVal === -Infinity || bestVal === Infinity ? 0 : bestVal };
}

function busiestDay(weekData: Record<string, number>) { return bestDay(weekData, "max"); }
function slowestDay(weekData: Record<string, number>) { return bestDay(weekData, "min"); }

function weekendWeekdayComparison(weekData: Record<string, number>) {
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const weekend = ["Saturday", "Sunday"];
  const wdVals = weekdays.map((d) => weekData[d] || 0).filter((v) => v > 0);
  const weVals = weekend.map((d) => weekData[d] || 0).filter((v) => v > 0);
  return {
    weekdayAvg: wdVals.length > 0 ? wdVals.reduce((s, v) => s + v, 0) / wdVals.length : 0,
    weekendAvg: weVals.length > 0 ? weVals.reduce((s, v) => s + v, 0) / weVals.length : 0,
  };
}

function totalWeekEntries(entryData: Record<string, number>): number { return sumValues(entryData); }
function avgDailyEntries(entryData: Record<string, number>): number { return avgNonZero(entryData); }
function busiestEntryDay(entryData: Record<string, number>) { return bestDay(entryData, "max"); }
function slowestEntryDay(entryData: Record<string, number>) { return bestDay(entryData, "min"); }

function weekendWeekdayEntries(entryData: Record<string, number>) {
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const weekendDays = ["Saturday", "Sunday"];
  return {
    weekday: weekdays.reduce((s, d) => s + (entryData[d] || 0), 0),
    weekend: weekendDays.reduce((s, d) => s + (entryData[d] || 0), 0),
  };
}

function proRatedWeekEntries(avgEntryData: Record<string, number>): number {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const jsDay = now.getUTCDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
  let total = 0;
  for (let i = 0; i < dayIndex; i++) total += avgEntryData[DAYS_OF_WEEK[i]] || 0;
  total += (avgEntryData[DAYS_OF_WEEK[dayIndex]] || 0) * (currentHour / 24);
  return total;
}

// Year
function averageYearOccupancy(yearData: Record<string, number>): number { return avgNonZero(yearData); }

function bestMonth(yearData: Record<string, number>, mode: "max" | "min") {
  let bestMonthName = "", bestVal = mode === "max" ? -Infinity : Infinity;
  for (const month of MONTHS) {
    const val = yearData[month] || 0;
    if (val === 0 && mode === "min") continue;
    if (mode === "max" ? val > bestVal : val < bestVal) { bestVal = val; bestMonthName = month; }
  }
  return { month: bestMonthName || MONTHS[0], avg: bestVal === -Infinity || bestVal === Infinity ? 0 : bestVal };
}

function busiestMonth(yearData: Record<string, number>) { return bestMonth(yearData, "max"); }
function slowestMonth(yearData: Record<string, number>) { return bestMonth(yearData, "min"); }
function totalYearEntries(entryData: Record<string, number>): number { return sumValues(entryData); }
function avgMonthlyEntries(entryData: Record<string, number>): number { return avgNonZero(entryData); }
function busiestEntryMonth(entryData: Record<string, number>) { return bestMonth(entryData, "max"); }
function slowestEntryMonth(entryData: Record<string, number>) { return bestMonth(entryData, "min"); }

function proRatedYearEntries(avgEntryData: Record<string, number>): number {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), currentMonth + 1, 0)).getUTCDate();
  let total = 0;
  for (let i = 0; i < currentMonth; i++) total += avgEntryData[MONTHS[i]] || 0;
  total += (avgEntryData[MONTHS[currentMonth]] || 0) * (currentDay / daysInMonth);
  return total;
}

// ── Process bundle response ──

interface InsightsData {
  dayData: Record<string, number>;
  avgDayData: Record<string, number>;
  entryDayData: Record<string, number>;
  avgEntryDayData: Record<string, number>;
  weekData: Record<string, number>;
  avgWeekData: Record<string, number>;
  entryWeekData: Record<string, number>;
  avgEntryWeekData: Record<string, number>;
  yearData: Record<string, number>;
  avgYearData: Record<string, number> | null;
  entryYearData: Record<string, number>;
  avgEntryYearData: Record<string, number> | null;
  dwellTimeMinutes: number | null;
}

function processInsightsBundle(bundle: InsightsBundleResponse): InsightsData {
  const { utcDate1, utcDate2, utcMinutesAtMidnight } = getLocalDayUTCBounds();
  const needsSecondDate = utcDate1 !== utcDate2;

  const day2Data = needsSecondDate ? (bundle.day_view_2 ?? {}) : {};
  const avgDay2Data = needsSecondDate ? (bundle.average_day_view_2 ?? {}) : {};
  const entryDay2Data = needsSecondDate ? (bundle.entry_day_view_2 ?? {}) : {};
  const avgEntryDay2Data = needsSecondDate ? (bundle.average_entry_day_view_2 ?? {}) : {};

  const maxIdx = getLocalDayOfWeekIndex();
  function stripFutureDays(rec: Record<string, number>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, val] of Object.entries(rec)) {
      const idx = DAYS_OF_WEEK.indexOf(key);
      if (idx === -1 || idx <= maxIdx) out[key] = val;
    }
    return out;
  }

  const rawDwell = bundle.dwell_time_view;
  const dwellMinutes = typeof rawDwell === "number" ? rawDwell : null;

  return {
    dayData: shiftDayDataToLocal(bundle.day_view, day2Data, utcMinutesAtMidnight),
    avgDayData: shiftDayDataToLocal(bundle.average_day_view, avgDay2Data, utcMinutesAtMidnight),
    entryDayData: shiftDayDataToLocal(bundle.entry_day_view, entryDay2Data, utcMinutesAtMidnight),
    avgEntryDayData: shiftDayDataToLocal(bundle.average_entry_day_view, avgEntryDay2Data, utcMinutesAtMidnight),
    weekData: stripFutureDays(bundle.week_view),
    avgWeekData: bundle.average_week_view,
    entryWeekData: stripFutureDays(bundle.entry_week_view),
    avgEntryWeekData: bundle.average_entry_week_view,
    yearData: bundle.year_view,
    avgYearData: bundle.average_year_view,
    entryYearData: bundle.entry_year_view,
    avgEntryYearData: bundle.average_entry_year_view,
    dwellTimeMinutes: dwellMinutes,
  };
}

// ── UI helper components ──

function TrendIndicator({ percentage }: { percentage: number }) {
  const dir = trendDirection(percentage);
  if (dir === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400 text-sm font-medium">
        <ArrowUp className="h-3.5 w-3.5" />
        {formatPercentage(percentage)}
      </span>
    );
  }
  if (dir === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400 text-sm font-medium">
        <ArrowDown className="h-3.5 w-3.5" />
        {formatPercentage(percentage)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-sm font-medium">
      <Minus className="h-3.5 w-3.5" />
      0%
    </span>
  );
}

function StatRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold">{value}</span>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">{children}</CardContent>
    </Card>
  );
}

function ComparisonRow({
  leftLabel, leftValue, rightLabel, rightValue, highlightLeft,
}: {
  leftLabel: string; leftValue: string; rightLabel: string; rightValue: string; highlightLeft?: boolean;
}) {
  const leftHighlight = highlightLeft === true;
  const rightHighlight = highlightLeft === false;
  return (
    <div className="grid grid-cols-2 gap-3 py-1.5">
      <div className={`text-center p-2 rounded-md ${leftHighlight ? "bg-primary/10" : "bg-muted/50"}`}>
        <p className="text-xs text-muted-foreground">{leftLabel}</p>
        <p className={`text-sm font-semibold ${leftHighlight ? "text-primary" : ""}`}>{leftValue}</p>
      </div>
      <div className={`text-center p-2 rounded-md ${rightHighlight ? "bg-primary/10" : "bg-muted/50"}`}>
        <p className="text-xs text-muted-foreground">{rightLabel}</p>
        <p className={`text-sm font-semibold ${rightHighlight ? "text-primary" : ""}`}>{rightValue}</p>
      </div>
    </div>
  );
}

function roundDisplay(n: number): string {
  return Math.round(n).toLocaleString();
}

// ── Today Tab ──

function TodayInsights({ data }: { data: InsightsData }) {
  const peak = peakOccupancy(data.dayData);
  const avgOcc = averageDayOccupancy(data.dayData);
  const fairAvg = fairHistoricalAvg(data.dayData, data.avgDayData, averageDayOccupancy);
  const peakVsTypical = vsAveragePercentage(peak.count, peakOccupancy(data.avgDayData).count);
  const busy = busiestPeriod(data.dayData);
  const slow = slowestPeriod(data.dayData);
  const ma = morningAfternoonComparison(data.dayData);
  const te = totalDayEntries(data.entryDayData);
  const ae = avgHourlyEntries(data.entryDayData);
  const pe = peakEntryHour(data.entryDayData);
  const be = busiestEntryPeriod(data.entryDayData);
  const mae = morningAfternoonEntries(data.entryDayData);
  const typicalEntries = totalDayEntries(data.avgEntryDayData);
  const entriesTrend = vsAveragePercentage(te, typicalEntries);
  const vsTypicalOcc = vsAveragePercentage(avgOcc, fairAvg);
  const fairEntryAvg = fairHistoricalAvg(data.entryDayData, data.avgEntryDayData, totalDayEntries);
  const vsTypicalEntries = vsAveragePercentage(te, fairEntryAvg);

  return (
    <div className="space-y-4">
      <InsightCard icon={BarChart3} title="Summary">
        <StatRow label="Peak Occupancy" value={roundDisplay(peak.count)} sub={<TrendIndicator percentage={peakVsTypical} />} />
        <StatRow label="Peak Hour" value={formatHour(peak.hour)} />
        <StatRow label="Avg Occupancy" value={roundDisplay(avgOcc)} />
      </InsightCard>

      {te > 0 && (
        <InsightCard icon={UserPlus} title="Entries">
          <StatRow label="Total Entries Today" value={roundDisplay(te)} sub={<TrendIndicator percentage={entriesTrend} />} />
          <StatRow label="Peak Entry Hour" value={formatHour(pe.hour)} sub={`${roundDisplay(pe.count)} entries`} />
          <StatRow label="Avg Hourly Entries" value={roundDisplay(ae)} />
          <StatRow label="Busiest Window" value={formatHourRange(be.startHour, be.endHour)} sub={`${roundDisplay(be.total)} entries`} />
        </InsightCard>
      )}

      {data.dwellTimeMinutes != null && data.dwellTimeMinutes > 0 && (
        <InsightCard icon={Timer} title="Avg Time of Stay">
          <StatRow label="Avg Visit Duration" value={formatDwellTime(data.dwellTimeMinutes)} />
          <p className="text-xs text-muted-foreground">Estimated from occupancy and entry data</p>
        </InsightCard>
      )}

      <InsightCard icon={Clock} title="Peak Times">
        <ComparisonRow
          leftLabel="Busiest" leftValue={formatHourRange(busy.startHour, busy.endHour)}
          rightLabel="Slowest" rightValue={formatHourRange(slow.startHour, slow.endHour)}
          highlightLeft={busy.avg > slow.avg}
        />
        <div className="grid grid-cols-2 gap-3">
          <p className="text-center text-xs text-muted-foreground">Avg: {roundDisplay(busy.avg)}</p>
          <p className="text-center text-xs text-muted-foreground">Avg: {roundDisplay(slow.avg)}</p>
        </div>
      </InsightCard>

      <InsightCard icon={Sunrise} title="Time of Day">
        <ComparisonRow
          leftLabel="Morning Avg" leftValue={roundDisplay(ma.morningAvg)}
          rightLabel="Afternoon Avg" rightValue={roundDisplay(ma.afternoonAvg)}
          highlightLeft={ma.morningAvg > ma.afternoonAvg ? true : ma.morningAvg < ma.afternoonAvg ? false : undefined}
        />
        {te > 0 && (
          <ComparisonRow
            leftLabel="Morning Entries" leftValue={roundDisplay(mae.morning)}
            rightLabel="Afternoon Entries" rightValue={roundDisplay(mae.afternoon)}
            highlightLeft={mae.morning > mae.afternoon ? true : mae.morning < mae.afternoon ? false : undefined}
          />
        )}
      </InsightCard>

      <InsightCard icon={ArrowLeftRight} title="vs Typical Day">
        <StatRow label="vs Historical Average" value={<TrendIndicator percentage={vsTypicalOcc} />} />
        {te > 0 && <StatRow label="Entries vs Historical" value={<TrendIndicator percentage={vsTypicalEntries} />} />}
      </InsightCard>
    </div>
  );
}

// ── Week Tab ──

function WeekInsights({ data }: { data: InsightsData }) {
  const busiest = busiestDay(data.weekData);
  const slowest = slowestDay(data.weekData);
  const avgOcc = averageWeekOccupancy(data.weekData);
  const fairAvg = fairHistoricalAvg(data.weekData, data.avgWeekData, averageWeekOccupancy);
  const peakVsTypical = vsAveragePercentage(busiest.avg, busiestDay(data.avgWeekData).avg);
  const ww = weekendWeekdayComparison(data.weekData);
  const te = totalWeekEntries(data.entryWeekData);
  const ade = avgDailyEntries(data.entryWeekData);
  const be = busiestEntryDay(data.entryWeekData);
  const se = slowestEntryDay(data.entryWeekData);
  const wwe = weekendWeekdayEntries(data.entryWeekData);
  const proRated = proRatedWeekEntries(data.avgEntryWeekData);
  const entriesTrend = vsAveragePercentage(te, proRated);
  const vsTypicalOcc = vsAveragePercentage(avgOcc, fairAvg);
  const vsTypicalEntries = vsAveragePercentage(te, proRated);

  return (
    <div className="space-y-4">
      <InsightCard icon={BarChart3} title="Summary">
        <StatRow label="Peak Daily Avg" value={`${roundDisplay(busiest.avg)} (${busiest.day})`} sub={<TrendIndicator percentage={peakVsTypical} />} />
        <StatRow label="Weekly Avg Occupancy" value={roundDisplay(avgOcc)} />
      </InsightCard>

      {te > 0 && (
        <InsightCard icon={UserPlus} title="Entries">
          <StatRow label="Total Entries This Week" value={roundDisplay(te)} sub={<TrendIndicator percentage={entriesTrend} />} />
          <StatRow label="Avg Daily Entries" value={roundDisplay(ade)} />
          <StatRow label="Most Entries" value={`${roundDisplay(be.avg)} (${be.day})`} />
          <StatRow label="Fewest Entries" value={`${roundDisplay(se.avg)} (${se.day})`} />
        </InsightCard>
      )}

      <InsightCard icon={Calendar} title="Day Performance">
        <ComparisonRow leftLabel="Busiest" leftValue={busiest.day} rightLabel="Slowest" rightValue={slowest.day} highlightLeft={busiest.avg > slowest.avg} />
        <div className="grid grid-cols-2 gap-3">
          <p className="text-center text-xs text-muted-foreground">Avg: {roundDisplay(busiest.avg)}</p>
          <p className="text-center text-xs text-muted-foreground">Avg: {roundDisplay(slowest.avg)}</p>
        </div>
      </InsightCard>

      <InsightCard icon={CalendarClock} title="Weekend vs Weekday">
        <ComparisonRow
          leftLabel="Weekday Avg" leftValue={roundDisplay(ww.weekdayAvg)}
          rightLabel="Weekend Avg" rightValue={roundDisplay(ww.weekendAvg)}
          highlightLeft={ww.weekdayAvg > ww.weekendAvg ? true : ww.weekdayAvg < ww.weekendAvg ? false : undefined}
        />
        {te > 0 && (
          <ComparisonRow
            leftLabel="Weekday Entries" leftValue={roundDisplay(wwe.weekday)}
            rightLabel="Weekend Entries" rightValue={roundDisplay(wwe.weekend)}
            highlightLeft={wwe.weekday > wwe.weekend ? true : wwe.weekday < wwe.weekend ? false : undefined}
          />
        )}
      </InsightCard>

      <InsightCard icon={ArrowLeftRight} title="vs Typical Week">
        <StatRow label="vs Historical Average" value={<TrendIndicator percentage={vsTypicalOcc} />} />
        {te > 0 && <StatRow label="Entries vs Historical" value={<TrendIndicator percentage={vsTypicalEntries} />} />}
      </InsightCard>
    </div>
  );
}

// ── Year Tab ──

function YearInsights({ data }: { data: InsightsData }) {
  const busiest = busiestMonth(data.yearData);
  const slowest = slowestMonth(data.yearData);
  const avgOcc = averageYearOccupancy(data.yearData);
  const avgYearAvailable = data.avgYearData !== null;
  const fairAvg = avgYearAvailable ? fairHistoricalAvg(data.yearData, data.avgYearData!, averageYearOccupancy) : 0;
  const peakVsTypical = avgYearAvailable ? vsAveragePercentage(busiest.avg, busiestMonth(data.avgYearData!).avg) : 0;
  const te = totalYearEntries(data.entryYearData);
  const ame = avgMonthlyEntries(data.entryYearData);
  const be = busiestEntryMonth(data.entryYearData);
  const se = slowestEntryMonth(data.entryYearData);
  const avgEntryYearAvailable = data.avgEntryYearData !== null;
  const proRated = avgEntryYearAvailable ? proRatedYearEntries(data.avgEntryYearData!) : 0;
  const entriesTrend = avgEntryYearAvailable ? vsAveragePercentage(te, proRated) : 0;
  const vsTypicalOcc = avgYearAvailable ? vsAveragePercentage(avgOcc, fairAvg) : 0;
  const vsTypicalEntries = avgEntryYearAvailable ? vsAveragePercentage(te, proRated) : 0;

  return (
    <div className="space-y-4">
      <InsightCard icon={BarChart3} title="Summary">
        <StatRow label="Peak Monthly Avg" value={`${roundDisplay(busiest.avg)} (${busiest.month})`} sub={avgYearAvailable ? <TrendIndicator percentage={peakVsTypical} /> : undefined} />
        <StatRow label="Yearly Avg Occupancy" value={roundDisplay(avgOcc)} />
      </InsightCard>

      {te > 0 && (
        <InsightCard icon={UserPlus} title="Entries">
          <StatRow label="Total Entries This Year" value={roundDisplay(te)} sub={avgEntryYearAvailable ? <TrendIndicator percentage={entriesTrend} /> : undefined} />
          <StatRow label="Avg Monthly Entries" value={roundDisplay(ame)} />
          <StatRow label="Most Entries" value={`${roundDisplay(be.avg)} (${be.month})`} />
          <StatRow label="Fewest Entries" value={`${roundDisplay(se.avg)} (${se.month})`} />
        </InsightCard>
      )}

      <InsightCard icon={Calendar} title="Month Performance">
        <ComparisonRow leftLabel="Busiest" leftValue={busiest.month} rightLabel="Slowest" rightValue={slowest.month} highlightLeft={busiest.avg > slowest.avg} />
        <div className="grid grid-cols-2 gap-3">
          <p className="text-center text-xs text-muted-foreground">Avg: {roundDisplay(busiest.avg)}</p>
          <p className="text-center text-xs text-muted-foreground">Avg: {roundDisplay(slowest.avg)}</p>
        </div>
      </InsightCard>

      {avgYearAvailable && (
        <InsightCard icon={ArrowLeftRight} title="vs Previous Years">
          <StatRow label="vs Historical Average" value={<TrendIndicator percentage={vsTypicalOcc} />} />
          {te > 0 && avgEntryYearAvailable && <StatRow label="Entries vs Historical" value={<TrendIndicator percentage={vsTypicalEntries} />} />}
        </InsightCard>
      )}
    </div>
  );
}

// ── Main Component ──

interface LocationInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationName: string;
  deviceIds: string[];
}

export function LocationInsightsDialog({
  open,
  onOpenChange,
  locationId,
  locationName,
  deviceIds,
}: LocationInsightsDialogProps) {
  const [period, setPeriod] = useState("today");

  const { utcDate1, utcDate2 } = getLocalDayUTCBounds();
  const needsSecondDate = utcDate1 !== utcDate2;
  const localDate = formatLocalDate();
  const currentYear = new Date().getUTCFullYear();

  const { data: insightsData, isLoading } = useQuery({
    queryKey: ["locationInsightsBundle", locationId],
    queryFn: async () => {
      const bundle = await api.getLocationInsightsBundle(locationId, deviceIds, {
        date: utcDate1,
        date2: needsSecondDate ? utcDate2 : null,
        week_date: localDate,
        year: currentYear,
      });
      return processInsightsBundle(bundle);
    },
    enabled: open && deviceIds.length > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Insights - {locationName || "Unnamed"}</DialogTitle>
        </DialogHeader>

        {isLoading || !insightsData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading insights...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList className="w-full">
                <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
                <TabsTrigger value="week" className="flex-1">This Week</TabsTrigger>
                <TabsTrigger value="year" className="flex-1">This Year</TabsTrigger>
              </TabsList>

              <p className="text-xs text-muted-foreground mt-3 px-1">
                {period === "today" && "Statistics are based on today's data. Only completed hours are fully counted."}
                {period === "week" && "Statistics are based on this week's data. Only completed days are fully counted, and the current day is pro-rated by hour."}
                {period === "year" && "Statistics are based on this year's data. Only completed months are fully counted, and the current month is pro-rated by day."}
              </p>

              <TabsContent value="today"><TodayInsights data={insightsData} /></TabsContent>
              <TabsContent value="week"><WeekInsights data={insightsData} /></TabsContent>
              <TabsContent value="year"><YearInsights data={insightsData} /></TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
