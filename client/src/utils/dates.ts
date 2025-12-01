import { DateTime } from "luxon";

type ParsedDateTime = {
    date: string;
    time: string;
};

export const parseUtcToZone = (
    isoString: string | null | undefined,
    zone = "America/New_York",
): ParsedDateTime | null => {
    if (!isoString) {
        return null;
    }

    const dt = DateTime.fromISO(isoString, { zone: "utc" }).setZone(zone);

    if (!dt.isValid) {
        return null;
    }

    return {
        date: dt.toFormat("yyyy-MM-dd"),
        time: dt.toFormat("HH:mm"),
    };
};