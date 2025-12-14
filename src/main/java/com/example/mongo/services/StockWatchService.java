package com.example.mongo.services;

import com.example.mongo.models.StockPriceEntry;
import com.example.mongo.models.StockWatch;
import com.example.mongo.repos.StockPriceEntryRepository;
import com.example.mongo.repos.StockWatchRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class StockWatchService {

  private final StockPriceEntryRepository priceRepo;
  private final StockWatchRepository stockWatchRepository;
  private final HttpClient client = HttpClient.newHttpClient();
  private final ObjectMapper mapper = new ObjectMapper();

  public StockWatchService(
      StockPriceEntryRepository priceRepo, StockWatchRepository stockWatchRepository) {
    this.priceRepo = priceRepo;
    this.stockWatchRepository = stockWatchRepository;
  }

  private Optional<Double> fetchCurrentPrice(String symbol) {
    String url = "http://127.0.0.1:5000/stock?ticker=" + symbol + "&currency=EUR";
    HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
    try {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() == 200) {
        JsonNode json = mapper.readTree(response.body());
        return Optional.of(json.get("price").asDouble());
      } else {
        System.err.println(
            "Failed to fetch data for symbol: " + symbol + " (HTTP " + response.statusCode() + ")");
      }
    } catch (IOException | InterruptedException e) {
      System.err.println("Error fetching price for symbol: " + symbol + " - " + e.getMessage());
    }
    return Optional.empty();
  }

  public void recordCurrentPrice(String symbol) {
    Optional<StockWatch> stockOpt = stockWatchRepository.findById(symbol);
    if (symbol.isEmpty()) {
      System.err.println("Invalid stock symbol provided.");
      return;
    }
    System.out.println("Recording current price for: " + symbol);
    if (stockOpt.isEmpty()) {
      System.err.println("Stock not found in watchlist: " + symbol);
      return;
    }
    Optional<Double> priceOpt = fetchCurrentPrice(symbol);
    if (priceOpt.isEmpty()) {
      System.err.println("Could not fetch current price for: " + symbol);
      return;
    }
    stockOpt.get().setCurrentPrice(priceOpt.get());
    stockWatchRepository.save(stockOpt.get());
    StockPriceEntry entry = new StockPriceEntry();
    entry.setPrice(priceOpt.get());
    entry.setStock(stockOpt.get());
    entry.setTimestamp(LocalDateTime.now());
    priceRepo.save(entry);
  }

  public String addToWatchlist(StockWatch request) {
    String symbol = request.getSymbol().toUpperCase();
    if (stockWatchRepository.existsById(symbol)) {
      return "Symbol already in watchlist: " + symbol;
    }
    Optional<Double> priceOpt = fetchCurrentPrice(symbol);
    double initialPrice = priceOpt.orElse(0.0);

    StockWatch stock = new StockWatch();
    stock.setSymbol(symbol);
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
    return stockWatchRepository.findAll();
  }

  public void deleteById(String symbol) {
    if (!stockWatchRepository.existsById(symbol)) {
      System.err.println("Symbol not found in watchlist: " + symbol);
      return;
    }
    stockWatchRepository.deleteById(symbol);
    System.out.println("Deleted " + symbol + " from watchlist.");
  }
}
