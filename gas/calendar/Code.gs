const CALENDAR_ID = 'c_c79fe46fb5b405e7481f135d67f5251e9d33dc211d78f5fe554d24f7e9f4dfee@group.calendar.google.com';
const MAX_PUBLIC_RANGE_DAYS = 730;

/**
 * 公開網頁唯一會呼叫的入口。
 * 只讀取 Google 日曆並回傳 JSON，不呼叫任何試算表寫入函式。
 */
function doGet(e) {
  try {
    const range = parsePublicRange_((e && e.parameter) || {});
    const events = readCalendarEvents_(range.start, range.endExclusive);

    return jsonOutput_({
      status: 'success',
      data: events
    });
  } catch (error) {
    return jsonOutput_({
      status: 'error',
      message: String(error && error.message ? error.message : error)
    });
  }
}

function parsePublicRange_(parameters) {
  const today = startOfDay_(new Date());
  const defaultEnd = addDays_(today, 9);
  const start = parameters.start ? parseDateOnly_(parameters.start) : today;
  const end = parameters.end ? parseDateOnly_(parameters.end) : defaultEnd;

  if (end.getTime() < start.getTime()) {
    throw new Error('結束日期不可早於開始日期。');
  }

  const rangeDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  if (rangeDays > MAX_PUBLIC_RANGE_DAYS) {
    throw new Error('查詢範圍最多為 ' + MAX_PUBLIC_RANGE_DAYS + ' 天。');
  }

  return {
    start: start,
    endExclusive: addDays_(end, 1)
  };
}

function parseDateOnly_(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('日期格式必須是 YYYY-MM-DD。');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('日期內容無效。');
  }

  return startOfDay_(date);
}

function readCalendarEvents_(start, endExclusive) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) throw new Error('找不到指定的日曆。');

  const timeZone = Session.getScriptTimeZone();
  return calendar.getEvents(start, endExclusive).map(function(event) {
    return {
      title: event.getTitle(),
      start: Utilities.formatDate(event.getStartTime(), timeZone, 'yyyy/MM/dd HH:mm'),
      end: Utilities.formatDate(event.getEndTime(), timeZone, 'yyyy/MM/dd HH:mm'),
      location: event.getLocation(),
      desc: event.getDescription()
    };
  }).sort(function(a, b) {
    return a.start.localeCompare(b.start);
  });
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function startOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays_(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
