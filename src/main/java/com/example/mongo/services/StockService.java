package com.example.mongo.services;

import com.example.mongo.models.StockHolding;
import com.example.mongo.models.StockHoldingHistory;
import com.example.mongo.models.dto.PortfolioStats;
import com.example.mongo.models.dto.StockRequest;
import com.example.mongo.repos.StockHoldingHistoryRepository;
import com.example.mongo.repos.StockRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class StockService {

  private final StockRepository stockRepository;
  private final StockHoldingHistoryRepository stockHoldingHistoryRepository;
  private final StockPriceService stockPriceService;

  @Autowired
  public StockService(
      StockRepository repo,
      StockHoldingHistoryRepository historyRepository,
      StockPriceService stockPriceService) {
    this.stockRepository = repo;
    this.stockHoldingHistoryRepository = historyRepository;
    this.stockPriceService = stockPriceService;
  }

  public List<StockHolding> getAllStocks() {
    return stockRepository.findAll();
  }

  public StockHolding addStock(StockRequest req) {
    StockHolding stock = new StockHolding();
    stock.setSymbol(req.symbol);
    stock.setQuantity(req.quantity);
    stock.setBuyPrice(req.buyPrice);
    stock.setBuyDate(req.buyDate);
    stock.setCurrentPrice(req.currentPrice);
    return stockRepository.save(stock);
  }

  public StockHolding updatePrice(String id, double newPrice) {
    StockHolding stock =
        stockRepository.findById(id).orElseThrow(() -> new RuntimeException("Stock not found"));
    stock.setCurrentPrice(newPrice);
    return stockRepository.save(stock);
  }

  public void deleteStock(String id) {
    stockRepository.deleteById(id);
  }

  public PortfolioStats getPortfolioStats() {
    List<StockHolding> holdings =
        stockRepository.findAll().stream().filter(i -> i.getSold() == false).toList();
    double invested = 0;
    double current = 0;

    for (StockHolding s : holdings) {
      invested += s.getQuantity() * s.getBuyPrice();
      current += s.getQuantity() * s.getCurrentPrice();
    }

    return new PortfolioStats(invested, current, current - invested);
  }

  public Set<String> HoldingTickers() {
    return stockRepository.findAll().stream()
        .map(StockHolding::getSymbol)
        .collect(Collectors.toSet());
  }

  public void updateHoldingCurrentPrice() {
    HashMap<String, Double> tickerPriceMap = new HashMap<>();
    Set<String> symbols =
        stockRepository.findAll().stream()
            .filter(
                stockHolding -> {
                  // Filter out holdings that are sold or have no symbol
                  return !stockHolding.getSold()
                      && stockHolding.getSymbol() != null
                      && !stockHolding.getSymbol().isEmpty();
                })
            .map(StockHolding::getSymbol)
            .collect(Collectors.toSet());

    // Use embedded Python service instead of HTTP calls
    for (String symbol : symbols) {
      try {
        Map<String, Object> priceData = stockPriceService.getStockPrice(symbol, "EUR");
        double price = (double) priceData.get("price");

        System.out.println(symbol);
        System.out.println(price);
        tickerPriceMap.put(symbol, price);
      } catch (Exception e) {
        System.err.println("Failed to fetch data for symbol: " + symbol);
        e.printStackTrace();
      }
    }

    List<StockHolding> allHoldings =
        stockRepository.findAll().stream()
            .filter(stockHolding -> tickerPriceMap.containsKey(stockHolding.getSymbol()))
            .toList();

    allHoldings.forEach(
        stockHolding -> {
          double newPrice = tickerPriceMap.get(stockHolding.getSymbol());
          double oldPrice = stockHolding.getCurrentPrice();

          // Only update if price has changed
          if (Math.abs(newPrice - oldPrice) > 0.01) {
            stockHolding.setCurrentPrice(newPrice);
            System.out.printf(
                "Updating %s from %.2f to %.2f EUR%n",
                stockHolding.getSymbol(), oldPrice, newPrice);
            updateStockHolding(stockHolding);
          }
        });

    stockRepository.saveAll(allHoldings);
  }

  private void updateStockHolding(StockHolding holding) {
    // Save history
    StockHoldingHistory history = new StockHoldingHistory();
    history.setStockHoldingId(holding.getId());
    history.setSymbol(holding.getSymbol());
    history.setQuantity(holding.getQuantity());
    history.setBuyPrice(holding.getBuyPrice());
    history.setBuyDate(holding.getBuyDate());
    history.setCurrentPrice(holding.getCurrentPrice());
    history.setUpdatedAt(LocalDateTime.now());
    stockHoldingHistoryRepository.save(history);
  }
}
