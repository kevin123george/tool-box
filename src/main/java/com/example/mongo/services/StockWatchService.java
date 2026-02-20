package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.StockPriceEntry;
import com.example.mongo.models.StockWatch;
import com.example.mongo.repos.StockPriceEntryRepository;
import com.example.mongo.repos.StockWatchRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class StockWatchService {

  private final StockPriceEntryRepository priceRepo;
  private final StockWatchRepository stockWatchRepository;
  private final StockPriceService stockPriceService;

  @Autowired private AuthUtils authUtils;

  @Autowired
  public StockWatchService(
      StockPriceEntryRepository priceRepo,
      StockWatchRepository stockWatchRepository,
      StockPriceService stockPriceService) {
    this.priceRepo = priceRepo;
    this.stockWatchRepository = stockWatchRepository;
    this.stockPriceService = stockPriceService;
  }

  private Optional<Double> fetchCurrentPrice(String symbol) {
    try {
      Map<String, Object> priceData = stockPriceService.getStockPrice(symbol, "EUR");
      double price = (double) priceData.get("price");
      return Optional.of(price);
    } catch (Exception e) {
      System.err.println("Error fetching price for symbol: " + symbol + " - " + e.getMessage());
      return Optional.empty();
    }
  }

  public void recordCurrentPrice(String symbol) {
    if (symbol == null || symbol.isEmpty()) {
      System.err.println("Invalid stock symbol provided.");
      return;
    }
    System.out.println("Recording current price for: " + symbol);
    // Find ALL watches for this symbol across all users
    List<StockWatch> watches = stockWatchRepository.findBySymbol(symbol);
    if (watches.isEmpty()) {
      System.err.println("No watches found for symbol: " + symbol);
      return;
    }
    Optional<Double> priceOpt = fetchCurrentPrice(symbol);
    if (priceOpt.isEmpty()) {
      System.err.println("Could not fetch current price for: " + symbol);
      return;
    }
    double price = priceOpt.get();
    for (StockWatch stockWatch : watches) {
      stockWatch.setCurrentPrice(price);
      stockWatchRepository.save(stockWatch);
      StockPriceEntry entry = new StockPriceEntry();
      entry.setPrice(price);
      entry.setStock(stockWatch);
      entry.setTimestamp(LocalDateTime.now());
      priceRepo.save(entry);
    }
  }

  public String addToWatchlist(StockWatch request) {
    String userId = authUtils.getCurrentUserId();
    String symbol = request.getSymbol().toUpperCase();
    if (stockWatchRepository.existsBySymbolAndUserId(symbol, userId)) {
      return "Symbol already in watchlist: " + symbol;
    }
    Optional<Double> priceOpt = fetchCurrentPrice(symbol);
    double initialPrice = priceOpt.orElse(0.0);

    StockWatch stock = new StockWatch();
    stock.setSymbol(symbol);
    stock.setUserId(userId);
    stock.setInitialPrice(initialPrice);
    stock.setAddedAt(LocalDateTime.now());
    stockWatchRepository.save(stock);

    StockPriceEntry entry = new StockPriceEntry();
    entry.setStock(stock);
    entry.setPrice(initialPrice);
    entry.setTimestamp(LocalDateTime.now());
    priceRepo.save(entry);

    return "Added " + symbol + " to watchlist at €" + initialPrice;
  }

  public List<StockWatch> getAllStocks() {
    return stockWatchRepository.findAllByUserId(authUtils.getCurrentUserId());
  }

  public void deleteById(String symbol) {
    String userId = authUtils.getCurrentUserId();
    Optional<StockWatch> watch = stockWatchRepository.findBySymbolAndUserId(symbol, userId);
    if (watch.isEmpty()) {
      System.err.println("Symbol not found in watchlist: " + symbol);
      return;
    }
    stockWatchRepository.deleteById(watch.get().getId());
    System.out.println("Deleted " + symbol + " from watchlist.");
  }
}
