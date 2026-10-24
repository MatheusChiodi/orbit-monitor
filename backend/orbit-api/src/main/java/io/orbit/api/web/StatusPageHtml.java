package io.orbit.api.web;

import io.orbit.workspace.status.StatusPageBuilder;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.function.Function;

/**
 * BE-59: the status page as one self-contained HTML document: no script, inline style only (allowed by
 * the CSP), every text escaped. It shows only what the JSON view has (title, group names, states and
 * uptime), so no monitor id, value or personal data can reach it.
 */
final class StatusPageHtml {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);

    private static final String STYLE = """
            :root{--bg:#f6f7f9;--card:#fff;--text:#14171c;--muted:#5b6472;--line:#e3e6eb;
            --ok:#1f9d55;--warn:#b7791f;--down:#d64545;--unknown:#6b7280}
            @media (prefers-color-scheme:dark){:root{--bg:#0d1117;--card:#161b22;--text:#e6edf3;--muted:#9aa4b2;
            --line:#30363d;--ok:#3fb950;--warn:#d29922;--down:#f85149;--unknown:#8b949e}}
            *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);
            font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
            main{max-width:720px;margin:0 auto;padding:40px 16px}h1{font-size:1.6rem;margin:0 0 16px}
            .overall{display:flex;align-items:center;gap:12px;padding:16px;border-radius:12px;
            background:var(--card);border:1px solid var(--line);font-weight:600;margin-bottom:24px}
            ul{list-style:none;margin:0;padding:0;background:var(--card);border:1px solid var(--line);border-radius:12px}
            li{display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid var(--line)}
            li:first-child{border-top:0}.name{flex:1}.meta{color:var(--muted);font-size:.875rem;text-align:right}
            .dot{width:12px;height:12px;border-radius:50%;flex:none}.OK{background:var(--ok)}
            .WARN{background:var(--warn)}.DOWN{background:var(--down)}.UNKNOWN{background:var(--unknown)}
            footer{color:var(--muted);font-size:.875rem;margin-top:16px}
            """;

    private StatusPageHtml() {
    }

    /** {@code text} resolves a message key ({@code status-page.*}) in the page language. */
    static String page(StatusPageBuilder.View view, boolean indexable, Locale locale, Function<String, String> text) {
        StringBuilder html = head(escape(view.title()), indexable, locale);
        html.append("<main><h1>").append(escape(view.title())).append("</h1>")
                .append("<p class=\"overall\" role=\"status\"><span class=\"dot ").append(state(view.overall()))
                .append("\" aria-hidden=\"true\"></span>")
                .append(escape(text.apply("status-page.overall." + state(view.overall())))).append("</p>");
        if (!view.groups().isEmpty()) {
            html.append("<ul>");
            for (StatusPageBuilder.GroupStatus group : view.groups()) {
                html.append("<li><span class=\"dot ").append(state(group.state())).append("\" aria-hidden=\"true\"></span>")
                        .append("<span class=\"name\">").append(escape(group.name())).append("</span>")
                        .append("<span class=\"meta\">").append(escape(text.apply("status-page.state." + state(group.state()))));
                if (group.uptimePercent() != null) {
                    html.append("<br>").append(escape(String.format(locale, "%.2f%% ", group.uptimePercent())))
                            .append(escape(text.apply("status-page.uptime")));
                }
                html.append("</span></li>");
            }
            html.append("</ul>");
        }
        html.append("<footer>").append(escape(text.apply("status-page.updated"))).append(" <time datetime=\"")
                .append(view.generatedAt()).append("\">").append(TIME.format(view.generatedAt()))
                .append("</time></footer></main></body></html>");
        return html.toString();
    }

    static String notFound(Locale locale, Function<String, String> text) {
        String title = escape(text.apply("status-page.not-found"));
        return head(title, false, locale).append("<main><h1>").append(title).append("</h1></main></body></html>")
                .toString();
    }

    private static StringBuilder head(String title, boolean indexable, Locale locale) {
        StringBuilder html = new StringBuilder(4096);
        html.append("<!doctype html><html lang=\"").append(lang(locale)).append("\"><head><meta charset=\"utf-8\">")
                .append("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">")
                .append("<meta http-equiv=\"refresh\" content=\"60\">");
        if (!indexable) {
            html.append("<meta name=\"robots\" content=\"noindex,nofollow\">");
        }
        return html.append("<title>").append(title).append("</title><style>").append(STYLE)
                .append("</style></head><body>");
    }

    static String lang(Locale locale) {
        return "pt".equals(locale.getLanguage()) ? "pt-BR" : "en";
    }

    private static String state(String state) {
        return switch (state == null ? "" : state) {
            case "OK", "WARN", "DOWN" -> state;
            default -> "UNKNOWN";
        };
    }

    static String escape(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder out = new StringBuilder(value.length() + 16);
        for (char c : value.toCharArray()) {
            switch (c) {
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '&' -> out.append("&amp;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> out.append(c);
            }
        }
        return out.toString();
    }
}
