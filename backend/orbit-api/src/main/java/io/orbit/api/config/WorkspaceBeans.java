package io.orbit.api.config;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigHealth;
import io.orbit.config.ConfigMapper;
import io.orbit.security.vault.SecretResolver;
import io.orbit.workspace.WorkspaceService;
import io.orbit.workspace.customization.CustomizationService;
import io.orbit.workspace.customization.TerminologyService;
import io.orbit.workspace.status.StatusPageBuilder;
import io.orbit.workspace.status.StatusPageService;
import io.orbit.workspace.theme.ThemeStore;
import io.orbit.workspace.variable.VariableService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.util.List;

/**
 * Workspace configuration files (docs/06): variables (BE-39), themes (BE-40), status pages (BE-42),
 * workspaces (CORE-07), customization and terminology (BE-51). Each {@link ConfigFile} is a bean so
 * the reloader and the health report see it.
 */
@Configuration
public class WorkspaceBeans {

    private final OrbitProperties properties;

    public WorkspaceBeans(OrbitProperties properties) {
        this.properties = properties;
    }

    @Bean
    ConfigFile<VariableService.Variable> variablesFile() {
        return new ConfigFile<>(properties.configDir(), "variables", VariableService.Variable.class,
                ConfigMapper.create(), VariableService.VALIDATOR);
    }

    @Bean
    VariableService variableService(ConfigFile<VariableService.Variable> variablesFile, SecretResolver secrets,
                                    Clock clock) {
        return new VariableService(variablesFile, secrets, clock, System::getenv);
    }

    @Bean
    ConfigFile<ThemeStore.CustomTheme> themesFile() {
        return new ConfigFile<>(properties.configDir(), "themes", ThemeStore.CustomTheme.class, ConfigMapper.create(),
                ThemeStore.VALIDATOR);
    }

    @Bean
    ThemeStore themeStore(ConfigFile<ThemeStore.CustomTheme> themesFile, Clock clock) {
        return new ThemeStore(themesFile, clock);
    }

    @Bean
    ConfigFile<StatusPageBuilder.StatusPage> statusPagesFile() {
        return new ConfigFile<>(properties.configDir(), "status-pages", StatusPageBuilder.StatusPage.class,
                ConfigMapper.create(), StatusPageService.VALIDATOR);
    }

    @Bean
    StatusPageService statusPageService(ConfigFile<StatusPageBuilder.StatusPage> statusPagesFile, Clock clock) {
        return new StatusPageService(statusPagesFile, clock);
    }

    @Bean
    ConfigFile<WorkspaceService.Workspace> workspacesFile() {
        return new ConfigFile<>(properties.configDir(), "workspaces", WorkspaceService.Workspace.class,
                ConfigMapper.create(), WorkspaceService.VALIDATOR);
    }

    @Bean
    WorkspaceService workspaceService(ConfigFile<WorkspaceService.Workspace> workspacesFile, Clock clock) {
        return new WorkspaceService(workspacesFile, clock);
    }

    @Bean
    ConfigFile<CustomizationService.Entry> customizationFile() {
        return new ConfigFile<>(properties.configDir(), "customization", CustomizationService.Entry.class,
                ConfigMapper.create(), CustomizationService.VALIDATOR);
    }

    @Bean
    CustomizationService customizationService(ConfigFile<CustomizationService.Entry> customizationFile, Clock clock) {
        return new CustomizationService(customizationFile, clock);
    }

    @Bean
    ConfigFile<TerminologyService.Terms> terminologyFile() {
        return new ConfigFile<>(properties.configDir(), "terminology", TerminologyService.Terms.class,
                ConfigMapper.create(), TerminologyService.VALIDATOR);
    }

    @Bean
    TerminologyService terminologyService(ConfigFile<TerminologyService.Terms> terminologyFile, Clock clock) {
        return new TerminologyService(terminologyFile, clock);
    }

    /** CORE-19: state of every config file; loaded files add the errors their domain reported. */
    @Bean
    ConfigHealth configHealth(List<ConfigFile<?>> files) {
        return new ConfigHealth(properties.configDir(), files);
    }
}
