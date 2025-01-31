import moment from 'moment-timezone';

export interface TimeWindow {
    from: number; // hours
    to: number; // hours
}

export interface TimeRangeResult {
    inTimeRange: boolean;
    currentTime: string;
    secondsUntilInRange: number;
}

export function isTimeInRange(date: Date, timeZone: string, timeWindow: TimeWindow): TimeRangeResult {
    const startSeconds = timeWindow.from * 3600;
    const endSeconds = timeWindow.to * 3600;

    // Check if timezone is valid
    if (!timeZone.startsWith("America")) {
        console.warn(`Invalid state abbreviation or unknown time zone: ${timeZone}`);
        return {
            inTimeRange: false,
            currentTime: "Invalid",
            secondsUntilInRange: -1
        };
    }

    // Current time in the specified timezone
    const currentTime = moment.tz(new Date(), timeZone);
    const currentTotalSeconds = currentTime.hours() * 3600 + currentTime.minutes() * 60 + currentTime.seconds();

    // Assigned time (from the given date) in the specified timezone
    const assignedTime = moment.tz(date, timeZone);
    const assignedTotalSeconds = assignedTime.hours() * 3600 + assignedTime.minutes() * 60 + assignedTime.seconds();

    let inTimeRange = false;
    let secondsUntilInRange = 0;

    // Check if the assigned time is in the range
    if (assignedTotalSeconds >= startSeconds && assignedTotalSeconds < endSeconds) {
        inTimeRange = true;
        secondsUntilInRange = 0;
    } else if (currentTotalSeconds < startSeconds) {
        inTimeRange = false;
        secondsUntilInRange = startSeconds - currentTotalSeconds;
    } else {
        inTimeRange = false;
        secondsUntilInRange = 86400 - currentTotalSeconds + startSeconds;
    }

    return {
        inTimeRange,
        currentTime: currentTime.format("h:mm a"),
        secondsUntilInRange
    };
}
