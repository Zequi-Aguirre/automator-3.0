/**
 * Utility functions for working with cron expressions
 */

/**
 * Validates if a given string is a valid cron expression
 * @param cronExpression The cron expression to validate
 * @returns boolean indicating if the expression is valid
 */
export function isValidCronFormat(cronExpression: string): boolean {
    // Check basic format (5 space-separated parts)
    const parts = cronExpression.trim().split(' ');
    if (parts.length !== 5) return false;

    // Regular expressions for each part
    const validators = {
        minutes: /^(\*|([0-9]|[1-5][0-9])(-([0-9]|[1-5][0-9]))?(,([0-9]|[1-5][0-9]))*|\*\/([0-9]|[1-5][0-9]))$/,
        hours: /^(\*|([0-9]|1[0-9]|2[0-3])(-([0-9]|1[0-9]|2[0-3]))?(,([0-9]|1[0-9]|2[0-3]))*|\*\/([0-9]|1[0-9]|2[0-3]))$/,
        daysOfMonth: /^(\*|([1-9]|[12][0-9]|3[01])(-([1-9]|[12][0-9]|3[01]))?(,([1-9]|[12][0-9]|3[01]))*|\*\/([1-9]|[12][0-9]|3[01]))$/,
        months: /^(\*|([1-9]|1[0-2])(-([1-9]|1[0-2]))?(,([1-9]|1[0-2]))*|\*\/([1-9]|1[0-2]))$/,
        daysOfWeek: /^(\*|[0-6](-[0-6])?(,[0-6])*|\*\/[0-6])$/
    };

    // Check each part against its corresponding regex
    return parts[0].match(validators.minutes) !== null &&
        parts[1].match(validators.hours) !== null &&
        parts[2].match(validators.daysOfMonth) !== null &&
        parts[3].match(validators.months) !== null &&
        parts[4].match(validators.daysOfWeek) !== null;
}

/**
 * Helper function to format a list of items into a natural language string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatList(items: any[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0].toString();
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Helper function to format hour values into readable strings
 */
function formatHour(hour: number): string {
    if (hour === 0) return 'midnight';
    if (hour === 12) return 'noon';
    if (hour > 12) {
        return `${hour - 12}:00 PM`;
    }
    return `${hour}:00 AM`;
}

/**
 * Helper function to format numbers with ordinal suffixes
 */
function formatOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Translates a cron expression into a human-readable string
 * @param cronExpression The cron expression to translate
 * @returns A human-readable description of the schedule
 * @throws Error if the cron expression is invalid
 */
export function translateCronExpression(cronExpression: string): string {
    const parts = cronExpression.trim().split(' ');

    if (parts.length !== 5) {
        throw new Error('Invalid cron expression. Must have 5 parts.');
    }

    const [minutes, hours, daysOfMonth, months, daysOfWeek] = parts;

    // Handle special cases first
    if (cronExpression === '* * * * *') return 'every minute';
    if (cronExpression === '*/1 * * * *') return 'every minute';
    if (cronExpression === '0 * * * *') return 'every hour';
    if (cronExpression === '0 0 * * *') return 'every day at midnight';

    const schedule: string[] = [];

    // Minutes
    if (minutes === '*') {
        schedule.push('every minute');
    } else if (minutes.includes('/')) {
        const [, interval] = minutes.split('/');
        schedule.push(`every ${interval} minute${interval === '1' ? '' : 's'}`);
    } else if (minutes.includes(',')) {
        const mins = minutes.split(',').map(m => parseInt(m));
        schedule.push(`at minute${mins.length > 1 ? 's' : ''} ${formatList(mins)}`);
    } else if (minutes.includes('-')) {
        const [start, end] = minutes.split('-').map(m => parseInt(m));
        schedule.push(`every minute from ${start} through ${end}`);
    } else {
        schedule.push(`at minute ${minutes}`);
    }

    // Hours
    if (hours !== '*') {
        if (hours.includes('/')) {
            const [, interval] = hours.split('/');
            schedule.push(`every ${interval} hour${interval === '1' ? '' : 's'}`);
        } else if (hours.includes(',')) {
            const hrs = hours.split(',').map(h => formatHour(parseInt(h)));
            schedule.push(`during hours ${formatList(hrs)}`);
        } else if (hours.includes('-')) {
            const [start, end] = hours.split('-').map(h => formatHour(parseInt(h)));
            schedule.push(`every hour from ${start} through ${end}`);
        } else {
            schedule.push(`at ${formatHour(parseInt(hours))}`);
        }
    }

    // Days of Month
    if (daysOfMonth !== '*') {
        if (daysOfMonth.includes('/')) {
            const [, interval] = daysOfMonth.split('/');
            schedule.push(`every ${interval} day${interval === '1' ? '' : 's'} of the month`);
        } else if (daysOfMonth.includes(',')) {
            const days = daysOfMonth.split(',').map(d => formatOrdinal(parseInt(d)));
            schedule.push(`on the ${formatList(days)}`);
        } else if (daysOfMonth.includes('-')) {
            const [start, end] = daysOfMonth.split('-').map(d => formatOrdinal(parseInt(d)));
            schedule.push(`from the ${start} through the ${end}`);
        } else {
            schedule.push(`on the ${formatOrdinal(parseInt(daysOfMonth))}`);
        }
    }

    // Months
    if (months !== '*') {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        if (months.includes('/')) {
            const [, interval] = months.split('/');
            schedule.push(`every ${interval} month${interval === '1' ? '' : 's'}`);
        } else if (months.includes(',')) {
            const mnths = months.split(',').map(m => monthNames[parseInt(m) - 1]);
            schedule.push(`in ${formatList(mnths)}`);
        } else if (months.includes('-')) {
            const [start, end] = months.split('-').map(m => monthNames[parseInt(m) - 1]);
            schedule.push(`from ${start} through ${end}`);
        } else {
            schedule.push(`in ${monthNames[parseInt(months) - 1]}`);
        }
    }

    // Days of Week
    if (daysOfWeek !== '*') {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        if (daysOfWeek.includes('/')) {
            const [, interval] = daysOfWeek.split('/');
            schedule.push(`every ${interval} day${interval === '1' ? '' : 's'} of the week`);
        } else if (daysOfWeek.includes(',')) {
            const days = daysOfWeek.split(',').map(d => dayNames[parseInt(d)]);
            schedule.push(`on ${formatList(days)}`);
        } else if (daysOfWeek.includes('-')) {
            const [start, end] = daysOfWeek.split('-').map(d => dayNames[parseInt(d)]);
            schedule.push(`from ${start} through ${end}`);
        } else {
            schedule.push(`on ${dayNames[parseInt(daysOfWeek)]}`);
        }
    }

    return schedule.join(' ');
}