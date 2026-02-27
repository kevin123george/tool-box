package dev.toolbox.controller;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.StockHoldingHistory;
import dev.toolbox.models.dto.OHLCData;
import dev.toolbox.models.dto.PerformanceMetrics;
import dev.toolbox.repos.StockHoldingHistoryRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hist")
public class StockHistoryController {

  @Autowired private StockHoldingHistoryRepository repository;
  @Autowired private AuthUtils authUtils;

  /** Get all histories - original endpoint */
  @GetMapping
  public Iterable<StockHoldingHistory> getAllHistories() {
    return repository.findAllByUserId(authUtils.getCurrentUserId());
  }

  /** Get latest entry per symbol - OPTIMIZED */
  @GetMapping("/latest")
  public List<StockHoldingHistory> getLatestPerSymbol() {
    List<StockHoldingHistory> allHistories =
        repository.findAllByUserIdOrderByUpdatedAtDesc(authUtils.getCurrentUserId());

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
    return repository.findBySymbolAndUserIdOrderByUpdatedAtAsc(
        symbol, authUtils.getCurrentUserId());
  }

  /** Get aggregated stats - OPTIMIZED */
  @GetMapping("/stats")
  public Map<String, Object> getAggregatedStats(
      @RequestParam(required = false) String symbol,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to) {

    String userId = authUtils.getCurrentUserId();
    List<StockHoldingHistory> histories;

    if (symbol != null && !symbol.equals("all")) {
      histories = repository.findBySymbolAndUserIdOrderByUpdatedAtAsc(symbol, userId);
    } else {
      histories = repository.findAllByUserIdOrderByUpdatedAtAsc(userId);
    }

    // Apply date filters
    if (from != null) {
      LocalDateTime fromDate = LocalDateTime.ofInstant(Instant.parse(from), ZoneId.systemDefault());
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isAfter(fromDate))
              .collect(Collectors.toList());
    }

    if (to != null) {
      LocalDateTime toDate = LocalDateTime.ofInstant(Instant.parse(to), ZoneId.systemDefault());
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

    String userId = authUtils.getCurrentUserId();
    List<StockHoldingHistory> histories;

    if (symbol != null && !symbol.equals("all")) {
      histories = repository.findBySymbolAndUserIdOrderByUpdatedAtAsc(symbol, userId);
    } else {
      histories = repository.findAllByUserIdOrderByUpdatedAtAsc(userId);
    }

    // Apply date filters
    if (from != null) {
      LocalDateTime fromDate = LocalDateTime.ofInstant(Instant.parse(from), ZoneId.systemDefault());
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isAfter(fromDate))
              .collect(Collectors.toList());
    }

    if (to != null) {
      LocalDateTime toDate = LocalDateTime.ofInstant(Instant.parse(to), ZoneId.systemDefault());
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

    String userId = authUtils.getCurrentUserId();
    if (symbol != null && !symbol.equals("all")) {
      return repository.findBySymbolAndUserIdOrderByUpdatedAtDesc(symbol, userId).stream()
          .limit(limit)
          .collect(Collectors.toList());
    }

    return repository.findAllByUserIdOrderByUpdatedAtDesc(userId).stream()
        .limit(limit)
        .collect(Collectors.toList());
  }

  /**
   * Get OHLC (candlestick) data for charting Aggregates price data into candles based on interval
   */
  @GetMapping("/ohlc/{symbol}")
  public List<OHLCData> getOHLCData(
      @PathVariable String symbol,
      @RequestParam(required = false, defaultValue = "1h") String interval,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to) {

    List<StockHoldingHistory> histories =
        repository.findBySymbolAndUserIdOrderByUpdatedAtAsc(symbol, authUtils.getCurrentUserId());

    // Apply date filters
    if (from != null) {
      LocalDateTime fromDate = LocalDateTime.ofInstant(Instant.parse(from), ZoneId.systemDefault());
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isAfter(fromDate))
              .collect(Collectors.toList());
    }

    if (to != null) {
      LocalDateTime toDate = LocalDateTime.ofInstant(Instant.parse(to), ZoneId.systemDefault());
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isBefore(toDate))
              .collect(Collectors.toList());
    }

    if (histories.isEmpty()) {
      return Collections.emptyList();
    }

    // Determine candle duration based on interval
    long intervalMinutes = parseInterval(interval);

    // Group data into candles
    Map<LocalDateTime, List<StockHoldingHistory>> candleGroups = new TreeMap<>();

    for (StockHoldingHistory h : histories) {
      LocalDateTime candleTime = truncateToInterval(h.getUpdatedAt(), intervalMinutes);
      candleGroups.computeIfAbsent(candleTime, k -> new ArrayList<>()).add(h);
    }

    // Build OHLC data
    List<OHLCData> ohlcList = new ArrayList<>();
    for (Map.Entry<LocalDateTime, List<StockHoldingHistory>> entry : candleGroups.entrySet()) {
      List<StockHoldingHistory> candle = entry.getValue();
      candle.sort(Comparator.comparing(StockHoldingHistory::getUpdatedAt));

      double open = candle.get(0).getCurrentPrice();
      double close = candle.get(candle.size() - 1).getCurrentPrice();
      double high =
          candle.stream().mapToDouble(StockHoldingHistory::getCurrentPrice).max().orElse(open);
      double low =
          candle.stream().mapToDouble(StockHoldingHistory::getCurrentPrice).min().orElse(open);
      double volume = candle.size(); // Use count as volume proxy

      long epochSeconds = entry.getKey().atZone(ZoneId.systemDefault()).toEpochSecond();
      ohlcList.add(
          OHLCData.builder()
              .time(epochSeconds)
              .open(open)
              .high(high)
              .low(low)
              .close(close)
              .volume(volume)
              .build());
    }

    return ohlcList;
  }

  /** Get performance metrics for a symbol */
  @GetMapping("/metrics/{symbol}")
  public PerformanceMetrics getPerformanceMetrics(
      @PathVariable String symbol,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to) {

    List<StockHoldingHistory> histories =
        repository.findBySymbolAndUserIdOrderByUpdatedAtAsc(symbol, authUtils.getCurrentUserId());

    // Apply date filters
    if (from != null) {
      LocalDateTime fromDate = LocalDateTime.ofInstant(Instant.parse(from), ZoneId.systemDefault());
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isAfter(fromDate))
              .collect(Collectors.toList());
    }

    if (to != null) {
      LocalDateTime toDate = LocalDateTime.ofInstant(Instant.parse(to), ZoneId.systemDefault());
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isBefore(toDate))
              .collect(Collectors.toList());
    }

    if (histories.isEmpty()) {
      return PerformanceMetrics.builder().symbol(symbol).build();
    }

    // Extract prices
    List<Double> prices =
        histories.stream().map(StockHoldingHistory::getCurrentPrice).collect(Collectors.toList());

    // Basic price stats
    double currentPrice = prices.get(prices.size() - 1);
    double firstPrice = prices.get(0);
    double highestPrice =
        prices.stream().mapToDouble(Double::doubleValue).max().orElse(currentPrice);
    double lowestPrice =
        prices.stream().mapToDouble(Double::doubleValue).min().orElse(currentPrice);
    double avgPrice =
        prices.stream().mapToDouble(Double::doubleValue).average().orElse(currentPrice);

    // Calculate returns
    List<Double> returns = new ArrayList<>();
    for (int i = 1; i < prices.size(); i++) {
      double ret = (prices.get(i) - prices.get(i - 1)) / prices.get(i - 1);
      returns.add(ret);
    }

    // Total return
    double totalReturn = firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;

    // Calculate days between first and last data point
    LocalDateTime firstDate = histories.get(0).getUpdatedAt();
    LocalDateTime lastDate = histories.get(histories.size() - 1).getUpdatedAt();
    long daysBetween = ChronoUnit.DAYS.between(firstDate, lastDate);
    int tradingDays = (int) Math.max(daysBetween, 1);

    // CAGR (Compound Annual Growth Rate)
    double years = tradingDays / 365.0;
    double cagr = years > 0 ? (Math.pow(currentPrice / firstPrice, 1.0 / years) - 1) * 100 : 0;

    // Daily return average
    double dailyReturn =
        returns.isEmpty()
            ? 0
            : returns.stream().mapToDouble(Double::doubleValue).average().orElse(0) * 100;

    // Volatility (annualized standard deviation of returns)
    double volatility = 0;
    if (returns.size() > 1) {
      double mean = returns.stream().mapToDouble(Double::doubleValue).average().orElse(0);
      double variance =
          returns.stream().mapToDouble(r -> Math.pow(r - mean, 2)).average().orElse(0);
      volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
    }

    // Max Drawdown
    double maxDrawdown = 0;
    double maxDrawdownPercent = 0;
    double peak = prices.get(0);
    for (double price : prices) {
      if (price > peak) {
        peak = price;
      }
      double drawdown = peak - price;
      double drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    // Sharpe Ratio (assuming 2% risk-free rate)
    double riskFreeRate = 0.02 / 252; // Daily risk-free rate
    double excessReturn =
        returns.isEmpty()
            ? 0
            : returns.stream().mapToDouble(Double::doubleValue).average().orElse(0) - riskFreeRate;
    double sharpeRatio = 0;
    if (volatility > 0 && !returns.isEmpty()) {
      double dailyVol =
          returns.stream()
              .mapToDouble(
                  r ->
                      Math.pow(
                          r - returns.stream().mapToDouble(Double::doubleValue).average().orElse(0),
                          2))
              .average()
              .orElse(0);
      dailyVol = Math.sqrt(dailyVol);
      sharpeRatio = dailyVol > 0 ? (excessReturn / dailyVol) * Math.sqrt(252) : 0;
    }

    // Sortino Ratio (only considers downside volatility)
    List<Double> negativeReturns = returns.stream().filter(r -> r < 0).collect(Collectors.toList());
    double sortinoRatio = 0;
    if (!negativeReturns.isEmpty()) {
      double downsideVariance =
          negativeReturns.stream().mapToDouble(r -> Math.pow(r, 2)).average().orElse(0);
      double downsideVol = Math.sqrt(downsideVariance);
      sortinoRatio = downsideVol > 0 ? (excessReturn / downsideVol) * Math.sqrt(252) : 0;
    }

    return PerformanceMetrics.builder()
        .symbol(symbol)
        .totalReturn(totalReturn)
        .cagr(cagr)
        .dailyReturn(dailyReturn)
        .volatility(volatility)
        .maxDrawdown(maxDrawdown)
        .maxDrawdownPercent(maxDrawdownPercent)
        .sharpeRatio(sharpeRatio)
        .sortinoRatio(sortinoRatio)
        .beta(0) // Requires benchmark data
        .alpha(0) // Requires benchmark data
        .correlation(0) // Requires benchmark data
        .highestPrice(highestPrice)
        .lowestPrice(lowestPrice)
        .currentPrice(currentPrice)
        .avgPrice(avgPrice)
        .dataPoints(prices.size())
        .tradingDays(tradingDays)
        .build();
  }

  /** Get buy points for annotations on chart */
  @GetMapping("/buypoints/{symbol}")
  public List<Map<String, Object>> getBuyPoints(@PathVariable String symbol) {
    List<StockHoldingHistory> histories =
        repository.findBySymbolAndUserIdOrderByUpdatedAtAsc(symbol, authUtils.getCurrentUserId());

    // Get unique buy dates with their prices
    Map<String, Map<String, Object>> buyPoints = new LinkedHashMap<>();

    for (StockHoldingHistory h : histories) {
      if (h.getBuyDate() != null) {
        String key = h.getBuyDate().toString();
        if (!buyPoints.containsKey(key)) {
          Map<String, Object> point = new HashMap<>();
          point.put("date", h.getBuyDate().toString());
          point.put("price", h.getBuyPrice());
          point.put("quantity", h.getQuantity());
          point.put("symbol", h.getSymbol());
          buyPoints.put(key, point);
        }
      }
    }

    return new ArrayList<>(buyPoints.values());
  }

  /** Combined portfolio value over time (all holdings summed by date) */
  @GetMapping("/portfolio-value")
  public List<Map<String, Object>> getPortfolioValueOverTime(
      @RequestParam(required = false, defaultValue = "3M") String range) {

    String userId = authUtils.getCurrentUserId();
    List<StockHoldingHistory> histories = repository.findAllByUserIdOrderByUpdatedAtAsc(userId);

    // Apply range filter
    LocalDateTime from =
        switch (range) {
          case "1W" -> LocalDateTime.now().minusWeeks(1);
          case "1M" -> LocalDateTime.now().minusMonths(1);
          case "3M" -> LocalDateTime.now().minusMonths(3);
          case "6M" -> LocalDateTime.now().minusMonths(6);
          case "1Y" -> LocalDateTime.now().minusYears(1);
          default -> null; // ALL
        };

    if (from != null) {
      final LocalDateTime fromFinal = from;
      histories =
          histories.stream()
              .filter(h -> h.getUpdatedAt().isAfter(fromFinal))
              .collect(Collectors.toList());
    }

    // Group by (holdingId, date) — keep latest entry per pair
    Map<String, Map<LocalDate, StockHoldingHistory>> byHoldingDate = new HashMap<>();
    for (StockHoldingHistory h : histories) {
      LocalDate date = h.getUpdatedAt().toLocalDate();
      byHoldingDate
          .computeIfAbsent(h.getStockHoldingId(), k -> new HashMap<>())
          .merge(
              date,
              h,
              (existing, newer) ->
                  newer.getUpdatedAt().isAfter(existing.getUpdatedAt()) ? newer : existing);
    }

    // For each date sum quantity * currentPrice (value) and quantity * buyPrice (invested)
    Map<LocalDate, double[]> byDate = new TreeMap<>();
    for (Map<LocalDate, StockHoldingHistory> dateMap : byHoldingDate.values()) {
      for (Map.Entry<LocalDate, StockHoldingHistory> entry : dateMap.entrySet()) {
        StockHoldingHistory h = entry.getValue();
        double[] sums = byDate.computeIfAbsent(entry.getKey(), k -> new double[] {0.0, 0.0});
        sums[0] += h.getQuantity() * h.getCurrentPrice();
        sums[1] += h.getQuantity() * h.getBuyPrice();
      }
    }

    List<Map<String, Object>> result = new ArrayList<>();
    for (Map.Entry<LocalDate, double[]> entry : byDate.entrySet()) {
      Map<String, Object> point = new HashMap<>();
      point.put("date", entry.getKey().toString());
      point.put("value", entry.getValue()[0]);
      point.put("invested", entry.getValue()[1]);
      result.add(point);
    }
    return result;
  }

  // Helper methods

  private long parseInterval(String interval) {
    return switch (interval.toLowerCase()) {
      case "1m" -> 1;
      case "5m" -> 5;
      case "15m" -> 15;
      case "30m" -> 30;
      case "1h" -> 60;
      case "4h" -> 240;
      case "1d" -> 1440;
      case "1w" -> 10080;
      default -> 60; // Default to 1 hour
    };
  }

  private LocalDateTime truncateToInterval(LocalDateTime time, long intervalMinutes) {
    long epochMinutes = time.atZone(ZoneId.systemDefault()).toEpochSecond() / 60;
    long truncatedMinutes = (epochMinutes / intervalMinutes) * intervalMinutes;
    return LocalDateTime.ofInstant(
        Instant.ofEpochSecond(truncatedMinutes * 60), ZoneId.systemDefault());
  }
}
