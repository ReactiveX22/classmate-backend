export const NotificationCategory = {
  CLASSROOM: 'CLASSROOM',
  ORGANIZATION: 'ORGANIZATION',
} as const;

export const NotificationType = {
  [NotificationCategory.CLASSROOM]: {
    ASSIGNMENT: 'CLASSROOM:ASSIGNMENT',
    GRADE: 'CLASSROOM:GRADE',
    POST: 'CLASSROOM:POST',
    ANNOUNCEMENT: 'CLASSROOM:ANNOUNCEMENT',
    MATERIAL: 'CLASSROOM:MATERIAL',
    QUESTION: 'CLASSROOM:QUESTION',
  },
  [NotificationCategory.ORGANIZATION]: {
    NOTICE: 'ORGANIZATION:NOTICE',
  },
  IMPORT: {
    COMPLETED: 'IMPORT:COMPLETED',
    FINISHED_WITH_ERRORS: 'IMPORT:FINISHED_WITH_ERRORS',
    FAILED: 'IMPORT:FAILED',
  },
} as const;

export type NotificationTypeValue =
  | (typeof NotificationType.CLASSROOM)[keyof typeof NotificationType.CLASSROOM]
  | (typeof NotificationType.ORGANIZATION)[keyof typeof NotificationType.ORGANIZATION]
  | (typeof NotificationType.IMPORT)[keyof typeof NotificationType.IMPORT];

type ClassroomValue =
  (typeof NotificationType.CLASSROOM)[keyof typeof NotificationType.CLASSROOM];

type OrganizationValue =
  (typeof NotificationType.ORGANIZATION)[keyof typeof NotificationType.ORGANIZATION];

export const isClassroomType = (type: string): type is ClassroomValue => {
  return (Object.values(NotificationType.CLASSROOM) as string[]).includes(type);
};

export const isOrganizationType = (type: string): type is OrganizationValue => {
  return (Object.values(NotificationType.ORGANIZATION) as string[]).includes(
    type,
  );
};
