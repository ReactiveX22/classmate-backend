export const IMPORT_QUEUE_NAME = 'import';

export const IMPORT_DEFAULTS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxRows: 20_000,
  batchSize: 500,
  rowErrorCap: 100,
  previewTtlMs: 30 * 60 * 1000,
  queueConcurrency: 2,
  importFolder: 'imports',
  previewFolder: 'imports/previews',
  errorFolder: 'imports/errors',
} as const;

export const IMPORT_HEADERS = {
  student: {
    name: 'name',
    email: 'email',
    phone: 'phone',
    studentId: 'studentId',
  },
  teacher: {
    name: 'name',
    email: 'email',
    phone: 'phone',
    title: 'title',
    joinDate: 'joinDate',
  },
} as const;

export const IMPORT_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'student name', 'teacher name', 'fullname'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'phone number', 'contact', 'mobile', 'cell'],
  studentId: [
    'student id',
    'studentid',
    'student_id',
    'id',
    'roll no',
    'rollno',
  ],
  title: ['title', 'designation', 'honorific', 'prefix'],
  joinDate: ['join date', 'joindate', 'join_date', 'date joined', 'hired date'],
};

export const ALLOWED_IMPORT_EXTENSIONS = ['.csv', '.xlsx'] as const;

export const IMPORT_FILE_TYPE_PATTERN =
  /^(text\/csv|text\/comma-separated-values|text\/plain|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/;

export type ImportType = 'student' | 'teacher';
