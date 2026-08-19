import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

const CALENDAR_TITLE = 'Opas';

export async function addToCalendar(event: {
  title: string;
  notes?: string;
  startDate: Date;
  endDate: Date;
  url?: string;
}): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Calendar Permission',
      'Opas needs calendar access to add deadline reminders. You can enable this in Settings.'
    );
    return false;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications);
  let calendarId: string | null = existing?.id ?? null;

  if (!calendarId) {
    if (Platform.OS === 'ios') {
      calendarId = await Calendar.createCalendarAsync({
        title: CALENDAR_TITLE,
        color: '#35503f',
        entityType: Calendar.EntityTypes.EVENT,
        source: { isLocalAccount: true, name: CALENDAR_TITLE, type: 'local' },
        name: CALENDAR_TITLE,
        ownerAccount: CALENDAR_TITLE,
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
    } else {
      calendarId = await Calendar.createCalendarAsync({
        title: CALENDAR_TITLE,
        color: '#35503f',
        entityType: Calendar.EntityTypes.EVENT,
        name: CALENDAR_TITLE,
        ownerAccount: CALENDAR_TITLE,
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
    }
  }

  if (!calendarId) return false;

  await Calendar.createEventAsync(calendarId, {
    title: event.title,
    notes: event.notes,
    startDate: event.startDate,
    endDate: event.endDate,
    url: event.url,
    timeZone: Platform.OS === 'ios' ? undefined : 'Europe/Helsinki',
    alarms: [{ relativeOffset: -86400 }],
  });

  return true;
}
