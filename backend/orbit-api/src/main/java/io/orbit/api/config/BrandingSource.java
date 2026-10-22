package io.orbit.api.config;

import io.orbit.api.wall.WallViews;
import io.orbit.security.settings.OrbitSettings;
import io.orbit.security.settings.SettingsService;
import io.orbit.security.settings.SvgSanitizer;

import java.util.Optional;
import java.util.function.Supplier;

/**
 * FE-10: workspace branding for the wall snapshot. The logo is sanitized again (the file may have been
 * edited by hand); the last result is memoized so a snapshot does not parse the SVG every time.
 */
final class BrandingSource implements Supplier<Optional<WallViews.BrandingView>> {

    private final SettingsService settings;
    private String lastInput;
    private String lastClean;

    BrandingSource(SettingsService settings) {
        this.settings = settings;
    }

    @Override
    public synchronized Optional<WallViews.BrandingView> get() {
        OrbitSettings.Branding branding = settings.current().branding();
        if (branding == null || (blank(branding.name()) && blank(branding.logoSvg()))) {
            return Optional.empty();
        }
        String logo = branding.logoSvg();
        if (!blank(logo) && !logo.equals(lastInput)) {
            lastInput = logo;
            try {
                lastClean = SvgSanitizer.sanitize(logo);
            } catch (IllegalArgumentException e) {
                lastClean = null;
            }
        }
        return Optional.of(new WallViews.BrandingView(blank(branding.name()) ? "" : branding.name(),
                blank(logo) ? null : lastClean));
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
