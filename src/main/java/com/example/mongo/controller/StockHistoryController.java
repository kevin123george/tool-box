package com.example.mongo.controller;

import com.example.mongo.models.StockHoldingHistory;
import com.example.mongo.repos.StockHoldingHistoryRepository;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hist")
@CrossOrigin
public class StockHistoryController {

  @Autowired private StockHoldingHistoryRepository repository;

  /** Get all histories - original endpoint */
  @GetMapping
  public Iterable<StockHoldingHistory> getAllHistories() {
    return repository.findAll();
  }

  /** Get latest entry per symbol - OPTIMIZED */
  @GetMapping("/latest")
  public List<StockHoldingHistory> getLatestPerSymbol() {
    List<StockHoldingHistory> allHistories =
        repository.findAll(Sort.by(Sort.Direction.DESC, "updatedAt"));

    Map<String, StockHoldingHistory> latestBySymbol = new HashMap<>();
    for (StockHoldingHistory history : allHistories) {
      if (!latestBySymbol.containsKey(history.getSymbol())) {
        latestBySymbol.put(history.getSymbol(), history);
      }
    }

    return new ArrayList<>(latestBySymbol.values());
  }

  /** Get history for specific symbol */
  @GetMapping("/symbol/{symbol}")
  public List<StockHoldingHistory> getHistoryBySymbol(@PathVariable String symbol) {
    return repository.findBySymbolOrderByUpdatedAtAsc(symbol);
  }

  /** Get aggregated stats - OPTIMIZED */
  @GetMapping("/stats")
  public Map<String, Object> getAggregatedStats(
      @RequestParam(required = false) String symbol,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to) {

    List<StockHoldingHistory> histories;

    if (symbol != null && !symbol.equals("all")) {
      histories = repository.findBySymbolOrderByUpdatedAtAsc(symbol);
    } else {
      histories =
          (List<StockHoldingHistory>) repository.findAll(Sort.by(Sort.Direction.ASC, "updatedAt"));
    }

    // Apply date filters
    if (from != null) {
      LocalDateTime fromDate = LocalDateTime.parse(from);
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isAfter(fromDate))
              .collect(Collectors.toList());
    }

    if (to != null) {
      LocalDateTime toDate = LocalDateTime.parse(to);
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isBefore(toDate))
              .collect(Collectors.toList());
    }

    // Get latest entry per symbol
    Map<String, StockHoldingHistory> latestBySymbol = new HashMap<>();
    for (StockHoldingHistory history : histories) {
      StockHoldingHistory existing = latestBySymbol.get(history.getSymbol());
      if (existing == null || history.getUpdatedAt().isAfter(existing.getUpdatedAt())) {
        latestBySymbol.put(history.getSymbol(), history);
      }
    }

    List<StockHoldingHistory> latestEntries = new ArrayList<>(latestBySymbol.values());

    // Calculate stats
    double totalInvested =
        latestEntries.stream().mapToDouble(h -> h.getQuantity() * h.getBuyPrice()).sum();

    double totalValue =
        latestEntries.stream().mapToDouble(h -> h.getQuantity() * h.getCurrentPrice()).sum();

    double avgBuyPrice =
        latestEntries.stream().mapToDouble(StockHoldingHistory::getBuyPrice).average().orElse(0.0);

    double avgCurrentPrice =
        latestEntries.stream()
            .mapToDouble(StockHoldingHistory::getCurrentPrice)
            .average()
            .orElse(0.0);

    double priceChange = avgCurrentPrice - avgBuyPrice;
    double changePercent = avgBuyPrice > 0 ? ((priceChange / avgBuyPrice) * 100) : 0;

    // Build response
    Map<String, Object> stats = new HashMap<>();
    stats.put("totalInvested", totalInvested);
    stats.put("totalValue", totalValue);
    stats.put("avgBuyPrice", avgBuyPrice);
    stats.put("currentPrice", avgCurrentPrice);
    stats.put("priceChange", priceChange);
    stats.put("changePercent", changePercent);
    stats.put("latestEntries", latestEntries);
    stats.put("symbols", latestBySymbol.keySet());

    return stats;
  }

  /** Get chart data - OPTIMIZED */
  @GetMapping("/chart")
  public Map<String, Object> getChartData(
      @RequestParam(required = false) String symbol,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to) {

    List<StockHoldingHistory> histories;

    if (symbol != null && !symbol.equals("all")) {
      histories = repository.findBySymbolOrderByUpdatedAtAsc(symbol);
    } else {
      histories =
          (List<StockHoldingHistory>) repository.findAll(Sort.by(Sort.Direction.ASC, "updatedAt"));
    }

    // Apply date filters
    if (from != null) {
      LocalDateTime fromDate = LocalDateTime.parse(from);
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isAfter(fromDate))
              .collect(Collectors.toList());
    }

    if (to != null) {
      LocalDateTime toDate = LocalDateTime.parse(to);
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isBefore(toDate))
              .collect(Collectors.toList());
    }

    // Group by symbol for chart data
    Map<String, List<Map<String, Object>>> dataBySymbol = new HashMap<>();

    for (StockHoldingHistory history : histories) {
      dataBySymbol
          .computeIfAbsent(history.getSymbol(), k -> new ArrayList<>())
          .add(
              Map.of(
                  "date", history.getUpdatedAt().toString(),
                  "buyPrice", history.getBuyPrice(),
                  "currentPrice", history.getCurrentPrice()));
    }

    Map<String, Object> response = new HashMap<>();
    response.put("data", dataBySymbol);

    return response;
  }

  /** Get recent entries (for table) - OPTIMIZED */
  @GetMapping("/recent")
  public List<StockHoldingHistory> getRecentEntries(
      @RequestParam(required = false, defaultValue = "20") int limit,
      @RequestParam(required = false) String symbol) {

    if (symbol != null && !symbol.equals("all")) {
      return repository.findBySymbolOrderByUpdatedAtDesc(symbol).stream()
          .limit(limit)
          .collect(Collectors.toList());
    }

    return repository.findAll(Sort.by(Sort.Direction.DESC, "updatedAt")).stream()
        .limit(limit)
        .collect(Collectors.toList());
  }
}
