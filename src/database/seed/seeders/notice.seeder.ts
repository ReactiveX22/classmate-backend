import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as noticeSchema from 'src/database/schema/notice-schema';
import * as notificationSchema from 'src/database/schema/notification-schema';
import { daysAgo, daysFromNow } from 'src/database/seed/date-utils';

const NOTICES_PATH = '../data/notices.json';

interface NoticeData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  daysAgo: number;
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

function getWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function buildPlaceholders(): Record<string, string> {
  const now = new Date();
  const semesterYear = now.getFullYear();

  // Midterm: ~2 weeks from now
  const midtermDay1 = daysFromNow(14);
  const midtermDay2 = daysFromNow(15);
  const midtermDay3 = daysFromNow(16);

  // CSE 481 project proposal extended deadline
  const proposalOriginal = daysAgo(2);
  const proposalDeadline = daysFromNow(5);

  // Tech Symposium: ~2.5 weeks out
  const symposiumDate = daysFromNow(18);
  const symposiumCfpDeadline = daysFromNow(10);

  // Career fair: ~3 weeks out
  const careerFairDate = daysFromNow(21);
  const resumeReviewDate = daysAgo(-14); // 14 days before fair, i.e. 7 days from now

  // AI policy effective date: already in effect (1 week ago)
  const policyEffective = daysAgo(7);

  // Hack club recruitment: this week
  const hackWeekStart = daysFromNow(0);
  const hackWeekEnd = daysFromNow(6);
  const hackInfoDate = daysFromNow(2);
  const hackDemoDate = daysFromNow(4);
  const hackSocialDate = daysFromNow(5);

  // Library extended hours: start tomorrow
  const libraryHoursStart = daysFromNow(1);

  // Tuition deadline: ~10 days out
  const tuitionDeadline = daysFromNow(10);

  // Guest lecture: 4 days out
  const lectureDate = daysFromNow(4);

  // Database lab closure: this weekend
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const labClosureStart = daysFromNow(daysUntilSaturday);
  const labClosureEnd = daysFromNow(daysUntilSaturday + 1);
  const labContactDeadline = daysFromNow(daysUntilSaturday - 2);

  // Scholarship deadline: ~30 days out
  const scholarshipDeadline = daysFromNow(30);
  const nextSemesterYear =
    today.getMonth() >= 6 ? semesterYear + 1 : semesterYear;

  // Flu vaccine clinic: this week (next 3 weekdays)
  const vaccineDays = getUpcomingWeekdays(3);

  // Student center renovation
  const renovationPhase2Start = daysAgo(3);
  const renovationCompletion = daysFromNow(28);

  // Intramural sports
  const registrationDeadline = daysFromNow(7);
  const gamesStart = daysFromNow(14);

  // Resume workshops: next 3 Wednesdays
  const workshopDates = getUpcomingWednesdays(3);

  return {
    '{{semester_year}}': String(semesterYear),
    '{{next_semester_year}}': String(nextSemesterYear),

    // Midterm
    '{{midterm_start}}': formatDateLong(midtermDay1),
    '{{midterm_end}}': formatDateLong(midtermDay3),
    '{{midterm_cse481}}': `${formatDateLong(midtermDay1)}, 2:00 PM – 4:00 PM`,
    '{{midterm_cse201}}': `${formatDateLong(midtermDay2)}, 9:00 AM – 11:00 AM`,
    '{{midterm_cse310}}': `${formatDateLong(midtermDay2)}, 1:00 PM – 3:00 PM`,
    '{{midterm_cse350}}': `${formatDateLong(midtermDay3)}, 10:00 AM – 12:00 PM`,
    '{{accommodation_deadline}}': formatDateShort(daysFromNow(10)),

    // CSE 481 project
    '{{proposal_original}}': formatDateLong(proposalOriginal),
    '{{proposal_deadline}}': formatDateLong(proposalDeadline),

    // Tech symposium
    '{{symposium_year}}': String(semesterYear),
    '{{symposium_date}}': formatDateLong(symposiumDate),
    '{{symposium_cfp_deadline}}': formatDateLong(symposiumCfpDeadline),

    // Career fair
    '{{career_fair_date}}': formatDateLong(careerFairDate),
    '{{career_fair_time}}': '10:00 AM – 3:00 PM',
    '{{resume_review_date}}': formatDateShort(resumeReviewDate),

    // AI policy
    '{{policy_effective}}': formatDateLong(policyEffective),

    // Hack club
    '{{hack_week_start}}': formatDateShort(hackWeekStart),
    '{{hack_week_end}}': formatDateShort(hackWeekEnd),
    '{{hack_info_date}}': `${getWeekday(hackInfoDate)}, ${formatDateShort(hackInfoDate)}`,
    '{{hack_demo_date}}': `${getWeekday(hackDemoDate)}, ${formatDateShort(hackDemoDate)}`,
    '{{hack_social_date}}': `${getWeekday(hackSocialDate)}, ${formatDateShort(hackSocialDate)}`,

    // Library
    '{{library_hours_start}}': formatDateLong(libraryHoursStart),

    // Tuition
    '{{tuition_deadline}}': formatDateLong(tuitionDeadline),
    '{{late_fee}}': '$50',

    // Guest lecture
    '{{lecturer_name}}': 'Wei Chen',
    '{{lecturer_affiliation}}': 'MIT Quantum Computing Lab',
    '{{lecturer_short}}': 'Dr. Chen',
    '{{lecture_date}}': `${getWeekday(lectureDate)}, ${formatDateShort(lectureDate)}`,
    '{{lecture_time}}': '3:00 PM – 4:30 PM',
    '{{lecture_room}}': 'Room 301, Science Building',

    // Database lab
    '{{lab_closure_start}}': `${getWeekday(labClosureStart)}, ${formatDateShort(labClosureStart)}`,
    '{{lab_closure_end}}': `${getWeekday(labClosureEnd)}, ${formatDateShort(labClosureEnd)}`,
    '{{lab_contact_deadline}}': formatDateShort(labContactDeadline),

    // Scholarship
    '{{scholarship_amount}}': '$2,500',
    '{{scholarship_deadline}}': formatDateLong(scholarshipDeadline),

    // Flu vaccine
    '{{vaccine_day1}}': `${getWeekday(vaccineDays[0])}, ${formatDateShort(vaccineDays[0])}`,
    '{{vaccine_day2}}': `${getWeekday(vaccineDays[1])}, ${formatDateShort(vaccineDays[1])}`,
    '{{vaccine_day3}}': `${getWeekday(vaccineDays[2])}, ${formatDateShort(vaccineDays[2])}`,

    // Student center renovation
    '{{renovation_phase2_start}}': formatDateLong(renovationPhase2Start),
    '{{renovation_completion}}': formatDateLong(renovationCompletion),

    // Intramural sports
    '{{registration_deadline}}': formatDateLong(registrationDeadline),
    '{{games_start}}': formatDateLong(gamesStart),

    // Resume workshops
    '{{workshop1_date}}': `${getWeekday(workshopDates[0])}, ${formatDateShort(workshopDates[0])}`,
    '{{workshop1_time}}': '3:00 PM – 3:45 PM',
    '{{workshop2_date}}': `${getWeekday(workshopDates[1])}, ${formatDateShort(workshopDates[1])}`,
    '{{workshop2_time}}': '3:00 PM – 3:45 PM',
    '{{workshop3_date}}': `${getWeekday(workshopDates[2])}, ${formatDateShort(workshopDates[2])}`,
    '{{workshop3_time}}': '3:00 PM – 3:45 PM',
  };
}

function getUpcomingWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(new Date(d));
    }
  }
  return days;
}

function getUpcomingWednesdays(count: number): Date[] {
  const wednesdays: Date[] = [];
  const d = new Date();
  // Find next Wednesday
  while (d.getDay() !== 3) {
    d.setDate(d.getDate() + 1);
  }
  for (let i = 0; i < count; i++) {
    wednesdays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return wednesdays;
}

export function replacePlaceholders(
  text: string,
  placeholders: Record<string, string>,
): string {
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

export async function seedNotices(
  db: NodePgDatabase<any>,
  orgId: string,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const noticesData = require(NOTICES_PATH) as NoticeData[];
  const placeholders = buildPlaceholders();

  const ADMIN_ID = 'usr_admin_001';

  const noticeInserts = noticesData.map((n) => ({
    id: n.id,
    organizationId: orgId,
    title: replacePlaceholders(n.title, placeholders),
    content: replacePlaceholders(n.content, placeholders),
    tags: n.tags,
    authorId: ADMIN_ID,
    createdAt: daysAgo(n.daysAgo),
    updatedAt: daysAgo(n.daysAgo),
  }));

  const inserted = await db
    .insert(noticeSchema.notice)
    .values(noticeInserts)
    .onConflictDoNothing({ target: noticeSchema.notice.id })
    .returning({ id: noticeSchema.notice.id });

  let results = inserted;
  if (inserted.length === 0) {
    results = await db
      .select({ id: noticeSchema.notice.id })
      .from(noticeSchema.notice)
      .where(eq(noticeSchema.notice.organizationId, orgId));
  }

  // Create matching notifications for each notice (deterministic IDs for idempotency)
  const NOTIFICATION_IDS = [
    'e04116f8-86ab-4ae6-aa01-741d70446309',
    'a44eb9b3-bb67-42fa-ad19-f0e2f6e01b26',
    '425cb789-adb6-4fcf-9d6f-79f201c37f50',
    '1e9001ec-53d4-4fc9-9cae-c6a0c7e79a3d',
    '15fd374f-df82-44b7-b98b-e1fd9102659b',
    '4df708c4-9a40-4683-b483-e48a5afbf076',
    '1ae8fe58-e7da-4c66-acb5-636261fbf0ad',
    '74295b5b-6c34-4670-ae4f-59f155f299c5',
    '63a1608f-1c94-486a-a3e0-a1d34966faa2',
    '7c65cebf-d3be-48be-b4bf-3f7bb897cb1a',
    '39047765-533e-445f-81b0-32c0d63f6a3d',
    '73b7de57-c406-40c8-a91a-ad3eb59d7e5e',
    '3913878a-7b07-4a4f-a429-fffa643fe2df',
    '8b4ed885-c4b4-4eb7-986d-371f4fde92d7',
    '8ca3356f-c05e-4675-8fea-eca0bddd48d8',
  ];

  const notificationInserts = noticesData.map((n, i) => ({
    id: NOTIFICATION_IDS[i],
    organizationId: orgId,
    title: 'New Notice Posted',
    content: `A new notice "${replacePlaceholders(n.title, placeholders)}" has been posted`,
    type: 'ORGANIZATION:NOTICE',
    recipientId: null as string | null,
    actorId: ADMIN_ID,
    entityId: n.id,
    createdAt: daysAgo(n.daysAgo),
  }));

  await db
    .insert(notificationSchema.notification)
    .values(notificationInserts)
    .onConflictDoNothing({ target: notificationSchema.notification.id });

  console.log(
    `  created ${results.length} notices and ${notificationInserts.length} notifications`,
  );

  return results.length;
}
