package com.example.mongo.crons;

import com.example.mongo.repos.StockWatchRepository;
import com.example.mongo.services.PriceAlertService;
import com.example.mongo.services.StockService;
import com.example.mongo.services.StockWatchService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

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

  @Scheduled(fixedDelay = 10000)
  public void updateStock() {
    System.out.println("Running stock price update cron job...");
    stockService.updateHoldingCurrentPrice();
  }

  @Scheduled(fixedDelay = 240000)
  public void updatedWatcher() {
    System.out.println("Running watchlist price update cron job...");
    stockWatchRepository.findDistinctStockSymbols().forEach(stockWatchService::recordCurrentPrice);
  }

  @Scheduled(fixedDelay = 60000)
  public void checkPriceAlerts() {
    System.out.println("Checking price alerts...");
    priceAlertService.checkAlerts();
  }
}

// watch list -- nike salando apple benz bmw adiddas amundi
