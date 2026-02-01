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
