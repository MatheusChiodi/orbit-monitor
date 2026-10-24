import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouteAction } from '@/app/console/routes';
import { createApiCore } from '@/shared/api/client';
import { Tabs } from '@/shared/ui';
import { createNotificationsApi, type NotificationsApi } from '../api/notificationsApi';
import { ChannelsTab } from '../ChannelsTab';
import { EscalationTab } from '../EscalationTab';
import { FailuresTab } from '../FailuresTab';
import { NotificationsContext } from '../model/queries';
import { OnCallTab } from '../OnCallTab';
import { TemplatesTab } from '../TemplatesTab';

export const NOTIFICATION_TABS = ['channels', 'failures', 'templates', 'escalation', 'oncall'] as const;
export type NotificationsTab = (typeof NOTIFICATION_TABS)[number];

export interface NotificationsSettingsProps {
  /** Defaults to the live API of this origin. */
  api?: NotificationsApi;
  /** Defaults to the server's access mode (`GET /api/access`). */
  editable?: boolean;
  initialTab?: NotificationsTab;
}

/** FE-77 Settings › Notifications: channels, delivery failures, message templates, escalation and on-call. */
export function NotificationsSettings({ api: given, editable: forced, initialTab = 'channels' }: NotificationsSettingsProps) {
  const { t, i18n } = useTranslation();
  const api = useMemo(() => given ?? createNotificationsApi({ getLocale: () => i18n.language }), [given, i18n]);
  const access = useQuery({
    queryKey: ['notifications', 'access'],
    queryFn: () => createApiCore().getAccess(),
    enabled: forced === undefined,
    staleTime: Infinity,
  });
  const editable = forced ?? access.data?.mode !== 'view-only';
  const [tab, setTab] = useState<NotificationsTab>(initialTab);
  // Command palette "Add notification channel" (`?action=add-channel`): Channels tab with the add dialog open.
  const [addRequest, setAddRequest] = useState(0);
  useRouteAction('add-channel', () => {
    setTab('channels');
    setAddRequest((n) => n + 1);
  });
  const context = useMemo(() => ({ api, editable }), [api, editable]);

  const panels: Record<NotificationsTab, ReactNode> = {
    channels: <ChannelsTab addRequest={addRequest} />,
    failures: <FailuresTab />,
    templates: <TemplatesTab />,
    escalation: <EscalationTab />,
    oncall: <OnCallTab />,
  };

  return (
    <NotificationsContext.Provider value={context}>
      <div className="flex min-w-0 flex-col gap-4">
        {!editable && <p className="m-0 text-sm text-muted">{t('notificationSettings.readOnly')}</p>}
        <Tabs
          label={t('notificationSettings.tabsLabel')}
          value={tab}
          onChange={setTab}
          items={NOTIFICATION_TABS.map((value) => ({ value, label: t(`notificationSettings.tabs.${value}`), content: <div className="pt-4">{panels[value]}</div> }))}
        />
      </div>
    </NotificationsContext.Provider>
  );
}

export default NotificationsSettings;
