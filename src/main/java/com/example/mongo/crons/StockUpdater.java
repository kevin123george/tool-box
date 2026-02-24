package com.example.mongo.crons;

import com.example.mongo.repos.StockWatchRepository;
import com.example.mongo.services.PriceAlertService;
import com.example.mongo.services.StockService;
import com.example.mongo.services.StockWatchService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class StockUpdater {

  private final StockService stockService;

  private final StockWatchRepository stockWatchRepository;

  private final StockWatchService stockWatchService;

  private final PriceAlertService priceAlertService;

  public StockUpdater(
      StockService stockService,
      StockWatchRepository stockWatchRepository,
      StockWatchService stockWatchService,
      PriceAlertService priceAlertService) {
    this.stockService = stockService;
    this.stockWatchRepository = stockWatchRepository;
    this.stockWatchService = stockWatchService;
    this.priceAlertService = priceAlertService;
  }

  @Scheduled(fixedDelay = 5000)
  public void updateStock() {
    log.info("[StockUpdater] Running stock price update");
    stockService.updateHoldingCurrentPrice();
  }

  @Scheduled(fixedDelay = 240000)
  public void updatedWatcher() {
    log.info("[StockUpdater] Running watchlist price update");
    stockWatchRepository.findDistinctStockSymbols().forEach(stockWatchService::recordCurrentPrice);
  }

  @Scheduled(fixedDelay = 60000)
  public void checkPriceAlerts() {
    log.debug("[StockUpdater] Checking price alerts");
    priceAlertService.checkAlerts();
  }
}

// watch list -- nike salando apple benz bmw adiddas amundi
