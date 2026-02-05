package com.example.mongo.crons;

import com.example.mongo.models.StockHolding;
import com.example.mongo.repos.StockRepository;
import com.example.mongo.services.AlphaVantageService;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class FundamentalDataRefresher {

  @Autowired private StockRepository stockRepository;
  @Autowired private AlphaVantageService alphaVantageService;

  @Scheduled(cron = "0 0 6 * * *")
  public void refreshFundamentalData() {
    log.info("[FundamentalRefresher] Starting daily fundamental data refresh...");

    List<String> symbols =
        stockRepository.findAll().stream()
            .filter(h -> h.getSold() == null || !h.getSold())
            .map(StockHolding::getSymbol)
            .distinct()
            .collect(Collectors.toList());

    log.info("[FundamentalRefresher] Refreshing data for {} symbols", symbols.size());

    for (String symbol : symbols) {
      try {
        log.info("[FundamentalRefresher] Refreshing overview for {}", symbol);
        alphaVantageService.fetchCompanyOverview(symbol);
      } catch (Exception e) {
        log.error("[FundamentalRefresher] Error refreshing {}: {}", symbol, e.getMessage());
      }
    }

    log.info("[FundamentalRefresher] Daily refresh complete");
  }
}
