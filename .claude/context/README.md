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
| [CORE-02](features/CORE-02-sql-validator-and-row-limit-wrapper.md) | SQL validator and row-limit wrapper | backend | done |
| [CORE-03](features/CORE-03-sql-probe-and-result-payload.md) | SQL probe and result payload | backend | in-progress |
| [CORE-04](features/CORE-04-http-probe-with-ssrf-protection.md) | HTTP probe with SSRF protection | backend | in-progress |
| [CORE-05](features/CORE-05-state-hysteresis-uptime-and-p95.md) | State, hysteresis, uptime and p95 | backend | done |
| [CORE-06](features/CORE-06-incidents-and-acknowledgement.md) | Incidents and acknowledgement | full-stack | in-progress |
| [CORE-07](features/CORE-07-workspaces-and-groups.md) | Workspaces and groups | full-stack | in-progress |
| [CORE-08](features/CORE-08-access-policy-vault-and-audit.md) | Access policy, vault and audit | full-stack | in-progress |
| [CORE-19](features/CORE-19-per-feature-json-configuration-files.md) | Per-feature JSON configuration files | backend | in-progress |
| [CORE-20](features/CORE-20-local-first-runtime.md) | Local-first runtime | full-stack | in-progress |
| [CORE-21](features/CORE-21-customization-registry.md) | Customization registry | full-stack | planned |
| [CORE-22](features/CORE-22-history-store.md) | 30-day history store | backend | done |
| [CORE-09](features/CORE-09-realtime-wall-updates.md) | Realtime wall updates | full-stack | in-progress |
| [CORE-10](features/CORE-10-data-display-step.md) | Data & display step | frontend | in-progress |
| [CORE-11](features/CORE-11-global-status-summary.md) | Global status summary | frontend | done |
| [CORE-12](features/CORE-12-value-formatting.md) | Value formatting | frontend | done |
| [CORE-13](features/CORE-13-threshold-rule-headroom-and-deviation.md) | Threshold rule, headroom and deviation | frontend | done |
| [CORE-14](features/CORE-14-monitor-state-severity.md) | Monitor state severity | backend | done |
| [CORE-15](features/CORE-15-internationalization-en-pt-br.md) | Internationalization (en / pt-BR) | full-stack | in-progress |
| [CORE-16](features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) | Sensitive data protection (LGPD / PCI DSS) | full-stack | in-progress |
| [CORE-17](features/CORE-17-design-tokens-and-base-theme.md) | Design tokens and base theme | frontend | done |
| [CORE-18](features/CORE-18-application-skeleton-and-health.md) | Application skeleton and health | backend | done |

### Frontend

| ID | Feature | Area | Status |
|---|---|---|---|
| [FE-01](features/FE-01-theme-editor.md) | Theme editor | frontend | in-progress |
| [FE-02](features/FE-02-contrast-guard.md) | Contrast guard | frontend | done |
| [FE-03](features/FE-03-theme-presets.md) | Theme gallery | frontend | in-progress |
| [FE-04](features/FE-04-theme-import-export.md) | Theme import/export | frontend | in-progress |
| [FE-05](features/FE-05-per-layout-theme.md) | Per-layout theme | frontend | in-progress |
| [FE-06](features/FE-06-animation-level.md) | Animation settings | frontend | in-progress |
| [FE-07](features/FE-07-density.md) | Density | frontend | done |
| [FE-08](features/FE-08-viewing-distance-scale.md) | Viewing distance scale | frontend | done |
| [FE-09](features/FE-09-night-mode-schedule.md) | Night mode schedule | frontend | done |
| [FE-10](features/FE-10-workspace-branding.md) | Workspace branding | frontend | done |
| [FE-11](features/FE-11-wall-layout-editor.md) | Wall layout editor | frontend | in-progress |
| [FE-12](features/FE-12-keyboard-drag-and-drop.md) | Keyboard drag and drop | frontend | done |
| [FE-13](features/FE-13-reorder-monitors-and-groups.md) | Reorder monitors and groups | frontend | in-progress |
| [FE-14](features/FE-14-reorder-fields-and-columns.md) | Reorder fields and columns | frontend | done |
| [FE-15](features/FE-15-undo-redo.md) | Undo/redo | frontend | done |
| [FE-16](features/FE-16-layout-templates.md) | Layout templates | frontend | done |
| [FE-17](features/FE-17-incident-simulator.md) | Incident simulator | frontend | done |
| [FE-18](features/FE-18-screen-previews.md) | Screen previews | frontend | done |
| [FE-19](features/FE-19-layout-playlist.md) | Layout playlist | frontend | in-progress |
| [FE-20](features/FE-20-video-wall-tiling.md) | Video wall tiling | frontend | in-progress |
| [FE-21](features/FE-21-visualization-picker.md) | Visualization picker | frontend | done |
| [FE-22](features/FE-22-compatibility-rules.md) | Compatibility rules | frontend | done |
| [FE-23](features/FE-23-visualization-settings.md) | Visualization settings | frontend | done |
| [FE-24](features/FE-24-20-display-modes.md) | 20 display modes | frontend | done |
| [FE-25](features/FE-25-week-over-week-overlay.md) | Week-over-week overlay | frontend | done |
| [FE-26](features/FE-26-chart-annotations.md) | Chart annotations | frontend | done |
| [FE-27](features/FE-27-zoom-and-synced-crosshair.md) | Zoom and synced crosshair | frontend | done |
| [FE-28](features/FE-28-command-palette.md) | Command palette | frontend | done |
| [FE-29](features/FE-29-keyboard-shortcuts.md) | Keyboard shortcuts | frontend | done |
| [FE-30](features/FE-30-saved-views.md) | Saved views | frontend | done |
| [FE-31](features/FE-31-bulk-actions.md) | Bulk actions | frontend | done |
| [FE-32](features/FE-32-monitor-templates-and-clone.md) | Monitor templates and clone | frontend | done |
| [FE-33](features/FE-33-sql-editor.md) | SQL editor | frontend | in-progress |
| [FE-34](features/FE-34-condition-builder.md) | Condition builder | frontend | in-progress |
| [FE-35](features/FE-35-json-explorer.md) | JSON explorer | frontend | in-progress |
| [FE-36](features/FE-36-query-history-diff.md) | Query history diff | frontend | in-progress |
| [FE-37](features/FE-37-onboarding.md) | Onboarding | frontend | done |
| [FE-38](features/FE-38-notification-center.md) | Notification center | frontend | in-progress |
| [FE-39](features/FE-39-incident-page.md) | Incident page | frontend | in-progress |
| [FE-40](features/FE-40-escalation-countdown.md) | Escalation countdown | frontend | in-progress |
| [FE-41](features/FE-41-maintenance-calendar.md) | Maintenance calendar | frontend | in-progress |
| [FE-42](features/FE-42-dependency-graph.md) | Dependency graph | frontend | in-progress |
| [FE-43](features/FE-43-sla-reports.md) | SLA reports | frontend | in-progress |
| [FE-44](features/FE-44-status-page-builder.md) | Status page builder | frontend | in-progress |
| [FE-45](features/FE-45-kiosk-mode.md) | Kiosk mode | frontend | done |
| [FE-46](features/FE-46-stale-data-indicator.md) | Stale data indicator | frontend | done |
| [FE-47](features/FE-47-sound-alerts.md) | Sound alerts | frontend | done |
| [FE-48](features/FE-48-desktop-notifications.md) | Desktop notifications | frontend | done |
| [FE-49](features/FE-49-mobile-on-call-view.md) | Mobile on-call view | frontend | done |
| [FE-50](features/FE-50-device-preferences.md) | Device preferences | frontend | done |
| [FE-51](features/FE-51-component-motion-system.md) | Component motion system | frontend | in-progress |
| [FE-52](features/FE-52-visual-fx-layer.md) | Visual FX layer (3D, glass, Remotion) | frontend | done |
| [FE-53](features/FE-53-customize-mode.md) | Customize mode and inspector | frontend | planned |
| [FE-54](features/FE-54-terminology-editor.md) | Terminology editor | frontend | planned |
| [FE-55](features/FE-55-card-behavior-settings.md) | Card and component behavior settings | frontend | planned |
| [FE-56](features/FE-56-typography-shape-density.md) | Typography, shape and density settings | frontend | planned |
| [FE-57](features/FE-57-customization-profiles.md) | Customization profiles | frontend | planned |
| [FE-58](features/FE-58-history-range-picker.md) | History range picker and coverage | frontend | in-progress |
| [FE-59](features/FE-59-living-orb.md) | Living orb (system map) | frontend | in-progress |

### Backend

| ID | Feature | Area | Status |
|---|---|---|---|
| [BE-01](features/BE-01-tcp-probe.md) | TCP probe | backend | done |
| [BE-02](features/BE-02-ping-probe.md) | Ping probe | backend | done |
| [BE-03](features/BE-03-push-monitor.md) | Push monitor | backend | done |
| [BE-04](features/BE-04-dns-probe.md) | DNS probe | backend | done |
| [BE-05](features/BE-05-certificate-and-domain-expiry.md) | Certificate and domain expiry | backend | done |
| [BE-06](features/BE-06-http-keyword-regex-match.md) | HTTP keyword/regex match | backend | done |
| [BE-07](features/BE-07-multi-step-http.md) | Multi-step HTTP | backend | done |
| [BE-08](features/BE-08-oauth2-client-credentials.md) | OAuth2 client credentials | backend | done |
| [BE-09](features/BE-09-grpc-health-probe.md) | gRPC health probe | backend | done |
| [BE-10](features/BE-10-kafka-consumer-lag-probe.md) | Kafka consumer lag probe | backend | done |
| [BE-11](features/BE-11-sql-parameters.md) | SQL parameters | backend | done |
| [BE-12](features/BE-12-query-catalog.md) | Query catalog | backend | done |
| [BE-13](features/BE-13-catalog-introspection.md) | Catalog introspection | backend | done |
| [BE-14](features/BE-14-query-cost-warning.md) | Query cost warning | backend | done |
| [BE-15](features/BE-15-per-target-isolation.md) | Per-target isolation | backend | done |
| [BE-16](features/BE-16-circuit-breaker.md) | Circuit breaker | backend | done |
| [BE-17](features/BE-17-execution-windows.md) | Execution windows | backend | done |
| [BE-18](features/BE-18-retries-with-backoff.md) | Retries with backoff | backend | done |
| [BE-19](features/BE-19-in-memory-rollups.md) | In-memory rollups | backend | done |
| [BE-20](features/BE-20-uptime-and-sla.md) | Uptime and SLA | backend | done |
| [BE-21](features/BE-21-percentiles.md) | Percentiles | backend | done |
| [BE-22](features/BE-22-anomaly-detection.md) | Anomaly detection | backend | done |
| [BE-23](features/BE-23-body-metric-extraction.md) | Body metric extraction | backend | done |
| [BE-24](features/BE-24-time-to-threshold.md) | Time to threshold | backend | done |
| [BE-25](features/BE-25-flapping-detection.md) | Flapping detection | backend | done |
| [BE-26](features/BE-26-incident-lifecycle.md) | Incident lifecycle | backend | in-progress |
| [BE-27](features/BE-27-escalation-policies.md) | Escalation policies | backend | done |
| [BE-28](features/BE-28-channels.md) | Channels | backend | in-progress |
| [BE-29](features/BE-29-deduplication.md) | Deduplication | backend | done |
| [BE-30](features/BE-30-cascade-suppression.md) | Cascade suppression | backend | done |
| [BE-31](features/BE-31-maintenance-windows.md) | Maintenance windows | backend | in-progress |
| [BE-32](features/BE-32-silence-snooze.md) | Silence/snooze | backend | done |
| [BE-33](features/BE-33-on-call-schedules.md) | On-call schedules | backend | done |
| [BE-34](features/BE-34-postmortem-report.md) | Postmortem report | backend | done |
| [BE-35](features/BE-35-notification-templates.md) | Notification templates | backend | in-progress |
| [BE-36](features/BE-36-channel-reliability.md) | Channel reliability | backend | done |
| [BE-37](features/BE-37-config-export-import.md) | Config export/import | backend | done |
| [BE-38](features/BE-38-realtime-protocol.md) | Realtime protocol | backend | in-progress |
| [BE-39](features/BE-39-workspace-variables.md) | Workspace variables | backend | in-progress |
| [BE-40](features/BE-40-workspace-defaults-and-themes-api.md) | Workspace defaults and themes API | backend | in-progress |
| [BE-41](features/BE-41-wall-layouts.md) | Wall layouts | backend | done |
| [BE-42](features/BE-42-status-page-api.md) | Status page API | backend | in-progress |
| [BE-43](features/BE-43-uptime-kuma-import.md) | Uptime Kuma import | backend | done |
| [BE-44](features/BE-44-network-access-policy.md) | Network access policy | backend | done |
| [BE-45](features/BE-45-operator-identity.md) | Operator identity | backend | done |
| [BE-46](features/BE-46-audit-query-api.md) | Audit query API | backend | in-progress |
| [BE-47](features/BE-47-rate-limiting.md) | Rate limiting | backend | done |
| [BE-48](features/BE-48-secret-rotation.md) | Secret rotation | backend | done |
| [BE-49](features/BE-49-problem-details-errors.md) | Problem Details errors | backend | done |
| [BE-50](features/BE-50-self-monitoring-and-config-backup.md) | Self-monitoring and config backup | backend | done |
| [BE-51](features/BE-51-customization-stores.md) | Customization and terminology stores | backend | planned |
| [BE-52](features/BE-52-history-query-apis.md) | History, events and audit query APIs | backend | in-progress |
| [BE-53](features/BE-53-app-log-rotation.md) | Application log rotation | backend | in-progress |
