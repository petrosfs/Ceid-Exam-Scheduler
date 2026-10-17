import { ExamWithSelection } from '../types';

const formatICSDate = (dateStr: string, timeStr: string): string => {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '');
  return `${cleanDate}T${cleanTime}00`;
};

const getEndDateTime = (dateStr: string, timeStr: string, durationMinutes: number): { date: string, time: string } => {
  const start = new Date(`${dateStr}T${timeStr}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  
  const yyyy = end.getFullYear();
  const mm = String(end.getMonth() + 1).padStart(2, '0');
  const dd = String(end.getDate()).padStart(2, '0');
  const hh = String(end.getHours()).padStart(2, '0');
  const min = String(end.getMinutes()).padStart(2, '0');
  
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`
  };
};

export const generateICS = (exams: ExamWithSelection[]): string => {
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CEID Exam Scheduler//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  exams.forEach((exam) => {
    const startDate = formatICSDate(exam.date, exam.time);
    const end = getEndDateTime(exam.date, exam.time, exam.duration);
    const endDate = formatICSDate(end.date, end.time);
    const reminders = exam.reminders || [];

    let alarmBlocks = '';
    reminders.forEach(minutes => {
        if (minutes > 0) {
            let duration = '';
            if (minutes >= 1440) { // Days
                duration = `-P${Math.floor(minutes / 1440)}D`;
            } else if (minutes >= 60) { // Hours
                duration = `-PT${Math.floor(minutes / 60)}H`;
            } else { // Minutes
                duration = `-PT${minutes}M`;
            }

            alarmBlocks += `BEGIN:VALARM
TRIGGER:${duration}
ACTION:DISPLAY
DESCRIPTION:Exam Reminder
END:VALARM
`;
        }
    });

    const formatInfo = exam.format ? `\\nFormat: ${exam.format}` : '';
    const codeInfo = exam.code ? `\\nCode: ${exam.code}` : '';
    const description = `Semester: ${exam.semester}\\nRoom: ${exam.room}\\nCurriculum: ${exam.category}${codeInfo}${formatInfo}`;

    icsContent += `BEGIN:VEVENT
UID:${exam.id}@ceid-scheduler
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;TZID=Europe/Athens:${startDate}
DTEND;TZID=Europe/Athens:${endDate}
SUMMARY:${exam.name}
DESCRIPTION:${description}
LOCATION:${exam.room}
STATUS:CONFIRMED
${alarmBlocks}END:VEVENT
`;
  });

  icsContent += `END:VCALENDAR`;
  return icsContent;
};

export const downloadICS = (exams: ExamWithSelection[], filename = 'ceid_exams.ics') => {
  const content = generateICS(exams);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getGoogleCalendarLink = (exam: ExamWithSelection): string => {
  const start = formatICSDate(exam.date, exam.time);
  const endData = getEndDateTime(exam.date, exam.time, exam.duration);
  const end = formatICSDate(endData.date, endData.time);
  
  const title = encodeURIComponent(`${exam.name}`);
  const formatInfo = exam.format ? `\nFormat: ${exam.format}` : '';
  const codeInfo = exam.code ? `\nCode: ${exam.code}` : '';
  // Removed reminder text from description as requested
  const details = encodeURIComponent(`Semester: ${exam.semester}\nCurriculum: ${exam.category}${codeInfo}${formatInfo}`);
  const location = encodeURIComponent(exam.room);
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
};