// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: magic;

/* =============================================================================
 * CONSTANTS
 ============================================================================ */

Date.prototype.addHours = function (numberHours) {
    const date = new Date(this.valueOf());
    date.setHours(date.getHours() + numberHours);
    return date;
};

Date.prototype.addMinutes = function (numberMinutes) {
    const date = new Date(this.valueOf());
    date.setMinutes(date.getMinutes() + numberMinutes);
    return date;
};

Date.prototype.truncateMinutes = function () {
    const date = new Date(this.valueOf());
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
};

/* =============================================================================
 * WIDGET CONFIGURATIONS *** CONFIGURE ME!!! ***
 ============================================================================ */

// Example: 12 PM
const HOUR_FORMAT = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
});

// Example: Sat
const DAY_OF_WEEK_FORMAT = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
});

// Example: 12
const DAY_OF_MONTH_FORMAT = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
});

/**
 * Widget confugurations. Edit these to customize the widget.
 */
const WIDGET_CONFIGURATIONS = {
    // Number of hours to show in the agenda
    numHours: 8,

    // Calendars to show events from. Empty array means all calendars.
    // Calendar names can be found in the "Calendar" App. The name must be an exact string match.
    calendars: [],

    excludedCalendars: [],

    // Calendar callback app
    // When clicking on the widget, which calendar app should open?
    // Must be one of the supported apps:
    //   - calshow - Default iOS Calendar
    //   - googlecalendar - Google Calendar
    //   - x-fantastical3 - Fantastical
    callbackCalendarApp: 'calshow',

    // Whether or not to use a background image for the widget
    useBackgroundImage: false,

    // If no background, default grayish background color gradient
    backgroundColor: [new Color('#29323c'), new Color('#1c1c1c')],

    // Font to use in Widget
    font: 'Menlo',

    // Bold Font to use in Widget
    fontBold: 'Menlo-Bold',

    // Default text size in Widget
    defaultTextSize: 10,

    // Larger text size in Widget
    largeTextSize: 25,

    // Second large text size in Widget
    secondLargeTextSize: 20,

    // Default text color in Widget
    defaultTextColor: Color.white(),

    // Default spacing between elements
    defaultSpacer: 10,

    // Smaller spacing between elements
    smallSpacer: 5,

    // Height of Widget's Draw Context
    widgetHeight: 800,

    // Width of Widget's Draw Context
    widgetWidth: 600,

    // Default padding in Draw Context
    padding: 10,

    // Left padding of events in Draw Context
    eventsLeftPadding: 80,

    // Corner radius of events in Draw Context
    eventsRounding: 10,

    // Text color of event titles
    eventsTextColor: Color.black(),

    // Thickness of hour/now line
    lineHeight: 4,

    // Color of hour/half-hour line
    lineColor: new Color('#ffffff', 0.3),
};

/* =============================================================================
 * WIDGET SET UP / PRESENTATION
 ============================================================================ */
const widget = new ListWidget();

await setBackground(widget, WIDGET_CONFIGURATIONS);

const events = await getEvents(WIDGET_CONFIGURATIONS);
console.log(JSON.stringify(events));

drawWidget(widget, events, WIDGET_CONFIGURATIONS);

console.log(`args.widgetParameter: ${JSON.stringify(args.widgetParameter)}`);

if (config.runsInWidget) {
    Script.setWidget(widget);
    Script.complete();
} else if (args.widgetParameter === 'callback') {
    const timestamp = (Date.now() - new Date('2001/01/01').getTime()) / 1000;
    const callback = new CallbackURL(`${WIDGET_CONFIGURATIONS.callbackCalendarApp}:${timestamp}`);
    callback.open();
    Script.complete();
} else {
    Script.setWidget(widget);
    widget.presentMedium();
    Script.complete();
}

/* =============================================================================
 * DRAW WIDGET
 ============================================================================ */

function drawWidget(widget, events, WIDGET_CONFIGURATIONS) {
    const mainStack = widget.addStack();
    mainStack.layoutHorizontally();
    mainStack.spacing = 10;

    // Left stack contains date, and all day events
    const leftStack = mainStack.addStack();
    leftStack.layoutVertically();

    // Right stack contains calendar events
    const rightStack = mainStack.addStack();
    rightStack.layoutVertically();

    drawLeftStack(leftStack, events, WIDGET_CONFIGURATIONS);
    drawRightStack(rightStack, events, WIDGET_CONFIGURATIONS);
}

function drawLeftStack(stack, events, {
    font,
    fontBold,
    defaultTextSize,
    largeTextSize,
    defaultTextColor,
    defaultSpacer,
    smallSpacer,
}) {
    const currentDate = new Date();

    const dateStack = stack.addStack();
    // DateStack.layoutHorizontally();
    dateStack.layoutVertically();

    const dowText = dateStack.addText(DAY_OF_WEEK_FORMAT.format(currentDate).toUpperCase());
    dowText.textColor = defaultTextColor;
    dowText.font = new Font(font, largeTextSize);

    dateStack.addSpacer(smallSpacer);

    const domText = dateStack.addText(DAY_OF_MONTH_FORMAT.format(currentDate));
    domText.textColor = defaultTextColor;
    domText.font = new Font(fontBold, largeTextSize);

    stack.addSpacer(defaultSpacer);

    const allDayEvents = events['all-day'];

    if (allDayEvents) {
        const allDayEventsText = stack.addText('All-day events');
        allDayEventsText.textColor = defaultTextColor;
        allDayEventsText.font = new Font(fontBold, defaultTextSize);

        stack.addSpacer(smallSpacer);

        for (const event of allDayEvents) {
            const eventStack = stack.addStack();
            eventStack.layoutHorizontally();

            const calendarIconText = eventStack.addText('\u2759');
            calendarIconText.textColor = new Color(event.color);
            calendarIconText.font = new Font(font, defaultTextSize);

            eventStack.addSpacer(smallSpacer);

            const calendarEventText = eventStack.addText(event.title);
            calendarEventText.textColor = defaultTextColor;
            calendarEventText.font = new Font(font, defaultTextSize);

            stack.addSpacer(smallSpacer);
        }
    } else {
        const noAllDayEventsText = stack.addText('No all-day events');
        noAllDayEventsText.textColor = defaultTextColor;
        noAllDayEventsText.font = new Font(fontBold, defaultTextSize);
    }
}

function drawRightStack(stack, events, {
    defaultTextColor,
    font,
    largeTextSize,
    secondLargeTextSize,
    eventsTextColor,
    numHours,
    widgetHeight,
    widgetWidth,
    padding,
    eventsLeftPadding,
    eventsRounding,
    lineHeight,
    lineColor,
}) {
    const halfHourEventHeight = widgetHeight / (numHours * 2);

    const draw = new DrawContext();
    draw.opaque = false;
    draw.respectScreenScale = true;
    draw.size = new Size(widgetWidth, widgetHeight);

    // Get the most near future event starts date
    let nearestFutureEventKey = null;
    for (const key in events) {
        if (key === 'all-day') {
            continue;
        }

        const eventDate = new Date(key);
        if (eventDate >= new Date()) {
            if (!nearestFutureEventKey) {
                nearestFutureEventKey = key;
            } else if (eventDate < new Date(nearestFutureEventKey)) {
                nearestFutureEventKey = key;
            }
        }
    }

    const currentDate = new Date(nearestFutureEventKey);

    // Loop through all the hours and draw the lines
    for (let i = 0; i < numHours; i++) {
        const currentHourDate = currentDate.addHours(i);
        const currentHourText = HOUR_FORMAT.format(currentHourDate);

        const topPointY = halfHourEventHeight * 2 * i;
        const midPointY = topPointY + halfHourEventHeight;

        // Draw line at the hour
        const topPath = new Path();
        topPath.addRect(new Rect(eventsLeftPadding - padding, topPointY, widgetWidth, lineHeight));
        draw.addPath(topPath);
        draw.setFillColor(lineColor);
        draw.fillPath();

        // Draw line at the half hour
        const middlePath = new Path();
        middlePath.addRect(new Rect(eventsLeftPadding - padding, midPointY, widgetWidth, lineHeight / 2));
        draw.addPath(middlePath);
        draw.setFillColor(lineColor);
        draw.fillPath();

        // Draw hour text
        draw.setTextColor(defaultTextColor);
        draw.setFont(new Font(font, largeTextSize));
        draw.drawText(`${currentHourText}`, new Point(0, topPointY));
    }

    // Get character set width of the large text size
    // assume width:height = 3:5
    const charWidth = largeTextSize * 3 / 5;

    // Loop through all the hours and draw the events (on top of the lines)
    for (let i = 0; i < numHours; i++) {
        const currentHourDate = currentDate.addHours(i).truncateMinutes();

        const topPointY = halfHourEventHeight * 2 * i;
        const midPointY = topPointY + halfHourEventHeight;

        // Draw events for this hour (if any)
        const hourEvents = events[currentHourDate];
        if (hourEvents) {
            // Determine width of events based on num events in hour
            const eventWidth = (widgetWidth - (eventsLeftPadding + padding * 3)) / hourEvents.length;

            // Determine how many character a text line should exist based on the event width
            const lineCharNumber = Math.floor((eventWidth - padding * 4) / charWidth);
            for (const [index, {startMinute, title, color, duration, eventLocation}] of hourEvents.entries()) {
                // Determine top Y of event
                const eventRectY = topPointY + Math.floor((startMinute * halfHourEventHeight) / 30);

                // Determine height of events
                const eventHeight = Math.floor((duration * halfHourEventHeight) / 30);

                // Determine left X of event
                const eventLeft = eventsLeftPadding + padding + index * eventWidth;

                const eventRect = new Rect(
                    // EventsLeftPadding + padding,
                    eventLeft,
                    eventRectY,
                    // WidgetWidth - (eventsLeftPadding + padding * 3),
                    eventWidth,
                    eventHeight,
                );
                const eventPath = new Path();
                eventPath.addRoundedRect(eventRect, eventsRounding, eventsRounding);

                draw.addPath(eventPath);
                draw.setFillColor(new Color(color));
                draw.fillPath();

                // Draw event name text
                draw.setTextColor(eventsTextColor);
                draw.setFont(new Font(font, largeTextSize));
                const wordWrapTitle = title.match(new RegExp(`.{1,${lineCharNumber}}`, 'g')).join('\n');

                // If title line is so many, truncate it
                if (wordWrapTitle.split('\n').length * largeTextSize > eventHeight) {
                    const truncatedTitle = wordWrapTitle.split('\n').slice(0, Math.floor(eventHeight / largeTextSize)).join('\n');
                    draw.drawText(`${truncatedTitle}`, new Point(eventLeft + padding + padding, eventRectY + padding / 2));
                } else {
                    draw.drawText(`${wordWrapTitle}`, new Point(eventLeft + padding + padding, eventRectY + padding / 2));
                }

                // Draw event location text
                draw.setFont(new Font(font, secondLargeTextSize));
                if (eventLocation) {
                    // Const wordWrapLocation = eventLocation.match(/.{1,lineCharNum}/g).join('\n');
                    const wordWrapLocation = eventLocation.match(new RegExp(`.{1,${lineCharNumber}}`, 'g')).join('\n');
                    // According to the height of the title and the event, change the location of the location text
                    const appendY = (largeTextSize + padding) * (wordWrapTitle.split('\n').length);
                    // If the location text will be out of the event, don't draw it
                    const locationTextHeight = largeTextSize * (wordWrapLocation.split('\n').length);
                    if (eventHeight - appendY > locationTextHeight) {
                        if (wordWrapLocation.split('\n').length * secondLargeTextSize > eventHeight - appendY) {
                            const truncatedLocation = wordWrapLocation.split('\n').slice(0, Math.floor((eventHeight - appendY) / secondLargeTextSize)).join('\n');
                            draw.drawText(`${truncatedLocation}`, new Point(eventLeft + padding + padding, eventRectY + padding / 2 + appendY));
                        } else {
                            draw.drawText(`${wordWrapLocation}`, new Point(eventLeft + padding + padding, eventRectY + padding / 2 + appendY));
                        }
                    }
                }
            }
        }
    }

    // Draw line at the current time
    const currentMinute = currentDate.getMinutes();
    const currentMinuteY = (currentMinute * halfHourEventHeight) / 30;
    const currentMinutePath = new Path();
    currentMinutePath.addRect(new Rect(eventsLeftPadding, currentMinuteY, widgetWidth, lineHeight));
    draw.addPath(currentMinutePath);
    draw.setFillColor(Color.red());
    draw.fillPath();

    // Put the content on the widget stack
    const drawn = draw.getImage();
    stack.addImage(drawn);
}

/* =============================================================================
 * FUNCTIONS
 ============================================================================ */

async function setBackground(widget, {useBackgroundImage, backgroundColor}) {
    if (useBackgroundImage) {
    // Determine if our image exists and when it was saved.
        const files = FileManager.local();
        const path = files.joinPath(files.documentsDirectory(), 'calendar-events-widget-background');
        const exists = files.fileExists(path);

        // If it exists and we're running in the widget, use photo from cache
        // Or we're invoking the script to run FROM the widget with a widgetParameter
        if (exists && config.runsInWidget || args.widgetParameter === 'callback') {
            widget.backgroundImage = files.readImage(path);

            // If it's missing when running in the widget, fallback to backgroundColor
        } else if (!exists && config.runsInWidget) {
            const bgColor = new LinearGradient();
            bgColor.colors = backgroundColor;
            bgColor.locations = [0, 1];
            widget.backgroundGradient = bgColor;

            // But if we're running in app, prompt the user for the image.
        } else if (config.runsInApp) {
            const img = await Photos.fromLibrary();
            widget.backgroundImage = img;
            files.writeImage(path, img);
        }
    } else {
        const bgColor = new LinearGradient();
        bgColor.colors = backgroundColor;
        bgColor.locations = [0, 1];
        widget.backgroundGradient = bgColor;
    }
}

async function getEvents({numHours, calendars, excludedCalendars}) {
    const todayEvents = await CalendarEvent.today([]);
    const tomorrowEvents = await CalendarEvent.tomorrow([]);
    const combinedEvents = todayEvents.concat(tomorrowEvents);

    let now = new Date();
    now = now.addMinutes(now.getMinutes() * -1);
    const inNumberHours = now.addHours(numHours);

    const eventsByHour = {};

    function filterEvents(e, start, end) {
        if (now >= end) {
            return false;
        }

        if (calendars.length > 0 && !calendars.includes(e.calendar.title)) {
            return false;
        }

        if (excludedCalendars.length > 0 && excludedCalendars.includes(e.calendar.title)) {
            return false;
        }

        // If the title contains "canceled" or "cancelled", don't show it
        if (e.title.toLowerCase().includes('canceled') || e.title.toLowerCase().includes('cancelled')) {
            return false;
        }

        return true;
    }

    for (const event of combinedEvents) {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);

        // Filter for events that:
        //   - start between now and numHours from now
        //   - are in the specified array of calendars (if any)
        if (filterEvents(event, start, end)) {
            if (event.isAllDay) { // All-day events
                eventsByHour['all-day'] ||= [];

                eventsByHour['all-day'].push({
                    title: event.title,
                    color: `#${event.calendar.color.hex}`,
                });
            } else if (start < now && end > now) { // Events that started before the current hour, but have not yet ended
                const hourKey = now.truncateMinutes();

                eventsByHour[hourKey] ||= [];

                const eventDuration = Math.floor(((end - start) / 1000) / 60) - (Math.floor(((now - start) / 1000) / 60));

                const eventObject = {
                    start,
                    end,
                    startMinute: start.getMinutes(),
                    title: event.title,
                    color: `#${event.calendar.color.hex}`,
                    duration: eventDuration,
                    eventLocation: event.location,
                };

                eventsByHour[hourKey].push(eventObject);
            } else { // Events that start between now and inNumHours
                const hourKey = start.truncateMinutes();

                eventsByHour[hourKey] ||= [];

                const eventDuration = Math.floor(((end - start) / 1000) / 60);

                const eventObject = {
                    start,
                    end,
                    startMinute: start.getMinutes(),
                    title: event.title,
                    color: `#${event.calendar.color.hex}`,
                    duration: eventDuration,
                    eventLocation: event.location,
                };

                eventsByHour[hourKey].push(eventObject);
            }
        }
    }

    return eventsByHour;
}
