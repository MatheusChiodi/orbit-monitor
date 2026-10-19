package io.orbit.api.config;

import io.orbit.api.runtime.EventBus;
import io.orbit.api.runtime.HistoryRecorder;
import io.orbit.history.HistorySettings;
import io.orbit.history.store.HistoryStore;
import io.orbit.monitor.definition.MonitorDefinitions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Clock;

/** 30-day on-disk history (CORE-22) under {@code orbit.data-dir}, fed from the event bus. */
@Configuration
public class HistoryBeans {

    @Bean(destroyMethod = "close")
    HistoryStore historyStore(@Value("${orbit.data-dir:${user.home}/.orbit/data}") Path dataDir,
                              @Value("${orbit.history-store.retention-days:30}") int retentionDays,
                              @Value("${orbit.history-store.max-disk-mb:1024}") long maxDiskMb,
                              @Value("${orbit.history-store.min-free-disk-mb:512}") long minFreeDiskMb,
                              Clock clock) throws IOException {
        return HistoryStore.open(new HistorySettings(dataDir, retentionDays, maxDiskMb, minFreeDiskMb), clock);
    }

    @Bean
    HistoryRecorder historyRecorder(HistoryStore store, MonitorDefinitions definitions, EventBus bus) {
        HistoryRecorder recorder = new HistoryRecorder(store, definitions);
        recorder.subscribe(bus);
        return recorder;
    }
}
