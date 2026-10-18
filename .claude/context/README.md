# Orbit Monitor — Context Index

Living context for humans and AI agents. **One file per screen and per feature.** Whenever code, tests or decisions change a screen or feature, update its file in the same commit (see [`../CLAUDE.md`](../CLAUDE.md)).

- Project overview, stack and conventions: [project.md](project.md)
- Specs (source of truth for requirements): [`docs/`](../../docs/)
- Status values: `planned` → `tests-pending` → `in-progress` → `done`

## Screens

| Screen | Route | File |
|---|---|---|
| Wall (TV mode) | `wall.html` | [screens/wall.md](screens/wall.md) |
| Monitor list | `index.html#/monitors` | [screens/monitor-list.md](screens/monitor-list.md) |
| HTTP monitor editor | `index.html#/monitors/new/http` | [screens/monitor-editor-http.md](screens/monitor-editor-http.md) |
| SQL monitor editor | `index.html#/monitors/new/sql` | [screens/monitor-editor-sql.md](screens/monitor-editor-sql.md) |
| Data & display step | `index.html#/monitors/:id/display` | [screens/data-and-display.md](screens/data-and-display.md) |
| Wall layout editor | `index.html#/layouts/:id` | [screens/layout-editor.md](screens/layout-editor.md) |
| Theme editor | `index.html#/settings/themes` | [screens/theme-editor.md](screens/theme-editor.md) |
| Device preferences | `index.html#/settings/preferences` | [screens/preferences.md](screens/preferences.md) |
| Incident list | `index.html#/incidents` | [screens/incidents.md](screens/incidents.md) |
| Incident detail | `index.html#/incidents/:id` | [screens/incident-detail.md](screens/incident-detail.md) |
| Maintenance calendar | `index.html#/maintenance` | [screens/maintenance-calendar.md](screens/maintenance-calendar.md) |
| Dependency graph | `index.html#/dependencies` | [screens/dependency-graph.md](screens/dependency-graph.md) |
| SLA reports | `index.html#/reports` | [screens/reports-sla.md](screens/reports-sla.md) |
| Status page builder | `index.html#/status-pages` | [screens/status-page.md](screens/status-page.md) |
| Settings and config files | `index.html#/settings` | [screens/settings.md](screens/settings.md) |
| Database connections | `index.html#/admin/connections` | [screens/admin-connections.md](screens/admin-connections.md) |
| Audit log | `index.html#/admin/audit` | [screens/audit-log.md](screens/audit-log.md) |
| Mobile on-call view | `wall.html (narrow)` | [screens/mobile-on-call.md](screens/mobile-on-call.md) |

## Features

### Core

| ID | Feature | Area | Status |
|---|---|---|---|
| [CORE-01](features/CORE-01-gatus-style-conditions.md) | Gatus-style conditions | backend | done |
| [CORE-02](features/CORE-02-sql-validator-and-row-limit-wrapper.md) | SQL validator and row-limit wrapper | backend | planned |
| [CORE-03](features/CORE-03-sql-probe-and-result-payload.md) | SQL probe and result payload | backend | planned |
| [CORE-04](features/CORE-04-http-probe-with-ssrf-protection.md) | HTTP probe with SSRF protection | backend | planned |
| [CORE-05](features/CORE-05-state-hysteresis-uptime-and-p95.md) | State, hysteresis, uptime and p95 | backend | planned |
| [CORE-06](features/CORE-06-incidents-and-acknowledgement.md) | Incidents and acknowledgement | full-stack | planned |
| [CORE-07](features/CORE-07-workspaces-and-groups.md) | Workspaces and groups | full-stack | planned |
| [CORE-08](features/CORE-08-access-policy-vault-and-audit.md) | Access policy, vault and audit | full-stack | planned |
| [CORE-19](features/CORE-19-per-feature-json-configuration-files.md) | Per-feature JSON configuration files | backend | planned |
| [CORE-20](features/CORE-20-local-first-runtime.md) | Local-first runtime | full-stack | planned |
| [CORE-09](features/CORE-09-realtime-wall-updates.md) | Realtime wall updates | full-stack | in-progress |
| [CORE-10](features/CORE-10-data-display-step.md) | Data & display step | frontend | in-progress |
| [CORE-11](features/CORE-11-global-status-summary.md) | Global status summary | frontend | done |
| [CORE-12](features/CORE-12-value-formatting.md) | Value formatting | frontend | done |
| [CORE-13](features/CORE-13-threshold-rule-headroom-and-deviation.md) | Threshold rule, headroom and deviation | frontend | done |
| [CORE-14](features/CORE-14-monitor-state-severity.md) | Monitor state severity | backend | done |
| [CORE-15](features/CORE-15-internationalization-en-pt-br.md) | Internationalization (en / pt-BR) | full-stack | planned |
| [CORE-16](features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) | Sensitive data protection (LGPD / PCI DSS) | full-stack | planned |
| [CORE-17](features/CORE-17-design-tokens-and-base-theme.md) | Design tokens and base theme | frontend | done |
| [CORE-18](features/CORE-18-application-skeleton-and-health.md) | Application skeleton and health | backend | done |

### Frontend

| ID | Feature | Area | Status |
|---|---|---|---|
| [FE-01](features/FE-01-theme-editor.md) | Theme editor | frontend | planned |
| [FE-02](features/FE-02-contrast-guard.md) | Contrast guard | frontend | planned |
| [FE-03](features/FE-03-theme-presets.md) | Theme presets | frontend | planned |
| [FE-04](features/FE-04-theme-import-export.md) | Theme import/export | frontend | planned |
| [FE-05](features/FE-05-per-layout-theme.md) | Per-layout theme | frontend | planned |
| [FE-06](features/FE-06-animation-level.md) | Animation level | frontend | planned |
| [FE-07](features/FE-07-density.md) | Density | frontend | planned |
| [FE-08](features/FE-08-viewing-distance-scale.md) | Viewing distance scale | frontend | planned |
| [FE-09](features/FE-09-night-mode-schedule.md) | Night mode schedule | frontend | planned |
| [FE-10](features/FE-10-workspace-branding.md) | Workspace branding | frontend | planned |
| [FE-11](features/FE-11-wall-layout-editor.md) | Wall layout editor | frontend | planned |
| [FE-12](features/FE-12-keyboard-drag-and-drop.md) | Keyboard drag and drop | frontend | planned |
| [FE-13](features/FE-13-reorder-monitors-and-groups.md) | Reorder monitors and groups | frontend | planned |
| [FE-14](features/FE-14-reorder-fields-and-columns.md) | Reorder fields and columns | frontend | planned |
| [FE-15](features/FE-15-undo-redo.md) | Undo/redo | frontend | planned |
| [FE-16](features/FE-16-layout-templates.md) | Layout templates | frontend | planned |
| [FE-17](features/FE-17-incident-simulator.md) | Incident simulator | frontend | planned |
| [FE-18](features/FE-18-screen-previews.md) | Screen previews | frontend | planned |
| [FE-19](features/FE-19-layout-playlist.md) | Layout playlist | frontend | planned |
| [FE-20](features/FE-20-video-wall-tiling.md) | Video wall tiling | frontend | planned |
| [FE-21](features/FE-21-visualization-picker.md) | Visualization picker | frontend | planned |
| [FE-22](features/FE-22-compatibility-rules.md) | Compatibility rules | frontend | planned |
| [FE-23](features/FE-23-visualization-settings.md) | Visualization settings | frontend | planned |
| [FE-24](features/FE-24-20-display-modes.md) | 20 display modes | frontend | planned |
| [FE-25](features/FE-25-week-over-week-overlay.md) | Week-over-week overlay | frontend | planned |
| [FE-26](features/FE-26-chart-annotations.md) | Chart annotations | frontend | planned |
| [FE-27](features/FE-27-zoom-and-synced-crosshair.md) | Zoom and synced crosshair | frontend | planned |
| [FE-28](features/FE-28-command-palette.md) | Command palette | frontend | planned |
| [FE-29](features/FE-29-keyboard-shortcuts.md) | Keyboard shortcuts | frontend | planned |
| [FE-30](features/FE-30-saved-views.md) | Saved views | frontend | planned |
| [FE-31](features/FE-31-bulk-actions.md) | Bulk actions | frontend | planned |
| [FE-32](features/FE-32-monitor-templates-and-clone.md) | Monitor templates and clone | frontend | planned |
| [FE-33](features/FE-33-sql-editor.md) | SQL editor | frontend | planned |
| [FE-34](features/FE-34-condition-builder.md) | Condition builder | frontend | planned |
| [FE-35](features/FE-35-json-explorer.md) | JSON explorer | frontend | planned |
| [FE-36](features/FE-36-query-history-diff.md) | Query history diff | frontend | planned |
| [FE-37](features/FE-37-onboarding.md) | Onboarding | frontend | planned |
| [FE-38](features/FE-38-notification-center.md) | Notification center | frontend | planned |
| [FE-39](features/FE-39-incident-page.md) | Incident page | frontend | planned |
| [FE-40](features/FE-40-escalation-countdown.md) | Escalation countdown | frontend | planned |
| [FE-41](features/FE-41-maintenance-calendar.md) | Maintenance calendar | frontend | planned |
| [FE-42](features/FE-42-dependency-graph.md) | Dependency graph | frontend | planned |
| [FE-43](features/FE-43-sla-reports.md) | SLA reports | frontend | planned |
| [FE-44](features/FE-44-status-page-builder.md) | Status page builder | frontend | planned |
| [FE-45](features/FE-45-kiosk-mode.md) | Kiosk mode | frontend | planned |
| [FE-46](features/FE-46-stale-data-indicator.md) | Stale data indicator | frontend | planned |
| [FE-47](features/FE-47-sound-alerts.md) | Sound alerts | frontend | planned |
| [FE-48](features/FE-48-desktop-notifications.md) | Desktop notifications | frontend | planned |
| [FE-49](features/FE-49-mobile-on-call-view.md) | Mobile on-call view | frontend | planned |
| [FE-50](features/FE-50-device-preferences.md) | Device preferences | frontend | planned |
| [FE-51](features/FE-51-component-motion-system.md) | Component motion system | frontend | planned |

### Backend

| ID | Feature | Area | Status |
|---|---|---|---|
| [BE-01](features/BE-01-tcp-probe.md) | TCP probe | backend | planned |
| [BE-02](features/BE-02-ping-probe.md) | Ping probe | backend | planned |
| [BE-03](features/BE-03-push-monitor.md) | Push monitor | backend | planned |
| [BE-04](features/BE-04-dns-probe.md) | DNS probe | backend | planned |
| [BE-05](features/BE-05-certificate-and-domain-expiry.md) | Certificate and domain expiry | backend | planned |
| [BE-06](features/BE-06-http-keyword-regex-match.md) | HTTP keyword/regex match | backend | planned |
| [BE-07](features/BE-07-multi-step-http.md) | Multi-step HTTP | backend | planned |
| [BE-08](features/BE-08-oauth2-client-credentials.md) | OAuth2 client credentials | backend | planned |
| [BE-09](features/BE-09-grpc-health-probe.md) | gRPC health probe | backend | planned |
| [BE-10](features/BE-10-kafka-consumer-lag-probe.md) | Kafka consumer lag probe | backend | planned |
| [BE-11](features/BE-11-sql-parameters.md) | SQL parameters | backend | planned |
| [BE-12](features/BE-12-query-catalog.md) | Query catalog | backend | planned |
| [BE-13](features/BE-13-catalog-introspection.md) | Catalog introspection | backend | planned |
| [BE-14](features/BE-14-query-cost-warning.md) | Query cost warning | backend | planned |
| [BE-15](features/BE-15-per-target-isolation.md) | Per-target isolation | backend | planned |
| [BE-16](features/BE-16-circuit-breaker.md) | Circuit breaker | backend | planned |
| [BE-17](features/BE-17-execution-windows.md) | Execution windows | backend | planned |
| [BE-18](features/BE-18-retries-with-backoff.md) | Retries with backoff | backend | planned |
| [BE-19](features/BE-19-in-memory-rollups.md) | In-memory rollups | backend | planned |
| [BE-20](features/BE-20-uptime-and-sla.md) | Uptime and SLA | backend | planned |
| [BE-21](features/BE-21-percentiles.md) | Percentiles | backend | planned |
| [BE-22](features/BE-22-anomaly-detection.md) | Anomaly detection | backend | planned |
| [BE-23](features/BE-23-body-metric-extraction.md) | Body metric extraction | backend | planned |
| [BE-24](features/BE-24-time-to-threshold.md) | Time to threshold | backend | planned |
| [BE-25](features/BE-25-flapping-detection.md) | Flapping detection | backend | planned |
| [BE-26](features/BE-26-incident-lifecycle.md) | Incident lifecycle | backend | planned |
| [BE-27](features/BE-27-escalation-policies.md) | Escalation policies | backend | planned |
| [BE-28](features/BE-28-channels.md) | Channels | backend | planned |
| [BE-29](features/BE-29-deduplication.md) | Deduplication | backend | planned |
| [BE-30](features/BE-30-cascade-suppression.md) | Cascade suppression | backend | planned |
| [BE-31](features/BE-31-maintenance-windows.md) | Maintenance windows | backend | planned |
| [BE-32](features/BE-32-silence-snooze.md) | Silence/snooze | backend | planned |
| [BE-33](features/BE-33-on-call-schedules.md) | On-call schedules | backend | planned |
| [BE-34](features/BE-34-postmortem-report.md) | Postmortem report | backend | planned |
| [BE-35](features/BE-35-notification-templates.md) | Notification templates | backend | planned |
| [BE-36](features/BE-36-channel-reliability.md) | Channel reliability | backend | planned |
| [BE-37](features/BE-37-config-export-import.md) | Config export/import | backend | planned |
| [BE-38](features/BE-38-realtime-protocol.md) | Realtime protocol | backend | planned |
| [BE-39](features/BE-39-workspace-variables.md) | Workspace variables | backend | planned |
| [BE-40](features/BE-40-workspace-defaults-and-themes-api.md) | Workspace defaults and themes API | backend | planned |
| [BE-41](features/BE-41-wall-layouts.md) | Wall layouts | backend | planned |
| [BE-42](features/BE-42-status-page-api.md) | Status page API | backend | planned |
| [BE-43](features/BE-43-uptime-kuma-import.md) | Uptime Kuma import | backend | planned |
| [BE-44](features/BE-44-network-access-policy.md) | Network access policy | backend | planned |
| [BE-45](features/BE-45-operator-identity.md) | Operator identity | backend | planned |
| [BE-46](features/BE-46-audit-query-api.md) | Audit query API | backend | planned |
| [BE-47](features/BE-47-rate-limiting.md) | Rate limiting | backend | planned |
| [BE-48](features/BE-48-secret-rotation.md) | Secret rotation | backend | planned |
| [BE-49](features/BE-49-problem-details-errors.md) | Problem Details errors | backend | planned |
| [BE-50](features/BE-50-self-monitoring-and-config-backup.md) | Self-monitoring and config backup | backend | planned |
