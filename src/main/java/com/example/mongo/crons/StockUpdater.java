package com.example.mongo.crons;

import com.example.mongo.repos.StockWatchRepository;
import com.example.mongo.services.StockService;
import com.example.mongo.services.StockWatchService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class StockUpdater {

  private final StockService stockService;

  private final StockWatchRepository stockWatchRepository;

  private final StockWatchService stockWatchService;

  public StockUpdater(
      StockService stockService,
      StockWatchRepository stockWatchRepository,
      StockWatchService stockWatchService) {
    this.stockService = stockService;
    this.stockWatchRepository = stockWatchRepository;
    this.stockWatchService = stockWatchService;
  }

  @Scheduled(fixedDelay = 10000)
  public void updateStock() {
    stockService.updateHoldingCurrentPrice();
  }

  //    @Scheduled(fixedDelay = 240000)
  //    public void updatedWatcher() {
  //
  // stockWatchRepository.findDistinctStockSymbols().forEach(stockWatchService::recordCurrentPrice);
  //    }
}

// watch list -- nike salando apple benz bmw adiddas amundi
