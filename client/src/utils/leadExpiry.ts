// src/utils/leadExpiry.ts
import { DateTime, Duration } from "luxon";

export const EXPIRE_HOURS = 18 as const; // TODO this should be a setting in the DB
export type Urgency = "expired" | "critical" | "warn" | "ok";

export function remainingMs(importedISO: string, nowUtc: DateTime = DateTime.utc()): number {
    const imported = DateTime.fromISO(importedISO, { zone: "utc" });
    const expiresAt = imported.plus({ hours: EXPIRE_HOURS });
    return expiresAt.toMillis() - nowUtc.toMillis();
}

export function formatRemaining(ms: number): string {
    if (ms <= 0) return "Expired";
    const d = Duration.fromMillis(ms).shiftTo("hours", "minutes");
    const h = Math.floor(d.hours);
    const m = Math.floor(d.minutes);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function getUrgency(ms: number): Urgency {
    // TODO: adjust thresholds as needed do settings in DB
    if (ms <= 0) return "expired";
    if (ms <= 2 * 60 * 1000) return "critical"; // < 2m
    if (ms <= 10 * 60 * 1000) return "warn"; // < 10m
    return "ok";
}

// Hard-coded HEX colors (no MUI palette involved)
export function colorForUrgency(u: Urgency): string {
    switch (u) {
        case "expired":
        case "critical":
            return "#D32F2F"; // red
        case "warn":
            return "#F57C00"; // orange
        case "ok":
        default:
            return "#374151"; // neutral dark gray
    }
}