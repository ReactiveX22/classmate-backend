export interface NotificationTemplateData {
  entityTitle?: string;
  entityContent?: string;
  actorName?: string;
  [key: string]: string | undefined;
}

export interface FormattedNotification {
  title: string;
  content: string;
}

type TemplateFormatter = (
  data: NotificationTemplateData,
) => FormattedNotification;

export class NotificationTemplate {
  private static templates: Record<string, TemplateFormatter> = {
    NOTICE: (data) => ({
      title: 'New Notice Posted',
      content: `A new notice "${data.entityTitle}" has been posted`,
    }),
    CLASSROOM_POST: (data) => ({
      title: 'New Classroom Post',
      content: `A new classroom post "${data.entityTitle}" has been posted`,
    }),
    CLASSROOM_ANNOUNCEMENT: (data) => ({
      title: 'New Announcement',
      content: `A new announcement "${data.entityTitle}" has been posted`,
    }),
    CLASSROOM_ASSIGNMENT: (data) => ({
      title: 'New Assignment',
      content: `A new assignment "${data.entityTitle}" has been posted`,
    }),
    CLASSROOM_MATERIAL: (data) => ({
      title: 'New Material',
      content: `New material "${data.entityTitle}" has been posted`,
    }),
    CLASSROOM_QUESTION: (data) => ({
      title: 'New Question',
      content: `A new question "${data.entityTitle}" has been posted`,
    }),
    CLASSROOM_GRADE: (data) => ({
      title: 'Assignment Graded',
      content: `Your submission for "${data.entityTitle}" has been graded`,
    }),
  };

  static format(
    type: string,
    data: NotificationTemplateData,
  ): FormattedNotification {
    const formatter = this.templates[type];
    if (!formatter) {
      return {
        title: data.entityTitle ?? 'Notification',
        content: data.entityContent ?? '',
      };
    }
    return formatter(data);
  }
}
