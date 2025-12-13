package com.example.mongo.services;

import com.example.mongo.models.StockHolding;
import com.example.mongo.models.StockHoldingHistory;
import com.example.mongo.models.dto.PortfolioStats;
import com.example.mongo.models.dto.StockRequest;
import com.example.mongo.repos.StockHoldingHistoryRepository;
import com.example.mongo.repos.StockRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class StockService {

  private final StockRepository stockRepository;

  private final StockHoldingHistoryRepository stockHoldingHistoryRepository;

  public StockService(StockRepository repo, StockHoldingHistoryRepository historyRepository) {
    this.stockRepository = repo;
    this.stockHoldingHistoryRepository = historyRepository;
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
    // TODO update this when we have more tickers

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

    HttpClient client = HttpClient.newHttpClient();
    ObjectMapper mapper = new ObjectMapper();

    for (String symbol : symbols) {
      try {
        String url = "http://127.0.0.1:5000/stock?ticker=" + symbol + "&currency=EUR";
        HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
          JsonNode json = mapper.readTree(response.body());
          double price = json.get("price").asDouble(); // This is the price in EUR
          System.out.println(symbol);
          System.out.println(price);
          tickerPriceMap.put(symbol, price);
        } else {
          System.err.println("Failed to fetch data for symbol: " + symbol);
        }
      } catch (Exception e) {
        e.printStackTrace(); // Or log the error
      }
    }

    List<StockHolding> allHoldings =
        stockRepository.findAll().stream()
            .filter(stockHolding -> tickerPriceMap.containsKey(stockHolding.getSymbol()))
            .toList();

    allHoldings.forEach(
        stockHolding -> {
          stockHolding.setCurrentPrice(
              tickerPriceMap.getOrDefault(
                  stockHolding.getSymbol(), stockHolding.getCurrentPrice()));

          if (stockHolding.getCurrentPrice()
              != tickerPriceMap.getOrDefault(
                  stockHolding.getSymbol(), stockHolding.getCurrentPrice())) {
            // Save history
            System.out.printf(
                "Updating %s to %.2f EUR%n",
                stockHolding.getSymbol(), stockHolding.getCurrentPrice());
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

    // Update holding...
  }
}
