package dev.toolbox.crons;

import dev.toolbox.services.FxRateService;
import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import dev.toolbox.models.FxRateHistory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class FxRateCron {

  @Autowired private FxRateService fxRateService;

  @PostConstruct
  public void initFetch() {
    Optional<FxRateHistory> latest = fxRateService.getLatestRate("INR", "EUR");
    boolean stale = latest.isEmpty()
        || latest.get().getFetchedAt().isBefore(Instant.now().minus(2, ChronoUnit.HOURS));
    if (stale) {
      log.info("[FxRate] No recent data on startup — fetching INR/EUR now");
      fxRateService.fetchAndSave("INR", "EUR");
    } else {
      log.info("[FxRate] Recent INR/EUR data found on startup, skipping initial fetch");
    }
  }

  @Scheduled(fixedDelay = 3600000)
  public void fetchHourly() {
    log.info("[FxRate] Hourly fetch: INR/EUR");
    fxRateService.fetchAndSave("INR", "EUR");
  }

  @Scheduled(cron = "0 0 2 * * *")
  public void pruneDaily() {
    log.info("[FxRate] Daily prune: removing entries older than 90 days");
    fxRateService.pruneOldData();
  }
}
