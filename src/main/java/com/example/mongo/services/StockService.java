package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.PortfolioTarget;
import com.example.mongo.models.StockHolding;
import com.example.mongo.models.StockHoldingHistory;
import com.example.mongo.models.dto.AllocationDTO;
import com.example.mongo.models.dto.CapitalGainsDTO;
import com.example.mongo.models.dto.CapitalGainsSummaryDTO;
import com.example.mongo.models.dto.PortfolioAllocationDTO;
import com.example.mongo.models.dto.PortfolioStats;
import com.example.mongo.models.dto.StockRequest;
import com.example.mongo.repos.PortfolioTargetRepository;
import com.example.mongo.repos.StockHoldingHistoryRepository;
import com.example.mongo.repos.StockRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class StockService {

  private final StockRepository stockRepository;
  private final StockHoldingHistoryRepository stockHoldingHistoryRepository;
  private final StockPriceService stockPriceService;
  private final PortfolioTargetRepository portfolioTargetRepository;

  @Autowired private AuthUtils authUtils;

  // German capital gains tax rate (Abgeltungssteuer)
  private static final double GERMAN_TAX_RATE = 0.26375;

  @Autowired
  public StockService(
      StockRepository repo,
      StockHoldingHistoryRepository historyRepository,
      StockPriceService stockPriceService,
      PortfolioTargetRepository portfolioTargetRepository) {
    this.stockRepository = repo;
    this.stockHoldingHistoryRepository = historyRepository;
    this.stockPriceService = stockPriceService;
    this.portfolioTargetRepository = portfolioTargetRepository;
  }

  public List<StockHolding> getAllStocks() {
    return stockRepository.findAllByUserId(authUtils.getCurrentUserId());
  }

  public StockHolding addStock(StockRequest req) {
    StockHolding stock = new StockHolding();
    stock.setSymbol(req.getSymbol());
    stock.setQuantity(req.getQuantity());
    stock.setBuyPrice(req.getBuyPrice());
    stock.setBuyDate(req.getBuyDate());
    stock.setCurrency(
        req.getCurrency() != null && !req.getCurrency().isBlank() ? req.getCurrency() : "EUR");
    stock.setCurrentPrice(req.getCurrentPrice());
    stock.setUserId(authUtils.getCurrentUserId());
    StockHolding saved = stockRepository.save(stock);

    // Fetch live price immediately so the holding shows real data right away
    try {
      Map<String, Object> priceData =
          stockPriceService.getStockPrice(saved.getSymbol(), saved.getCurrency());
      double livePrice = (double) priceData.get("price");
      saved.setCurrentPrice(livePrice);
      saved = stockRepository.save(saved);
      log.info(
          "[addStock] Initial price for {} ({}): {}",
          saved.getSymbol(),
          saved.getCurrency(),
          livePrice);
    } catch (Exception e) {
      log.warn(
          "[addStock] Could not fetch initial price for {}: {}", saved.getSymbol(), e.getMessage());
    }

    final StockHolding ref = saved;
    CompletableFuture.runAsync(() -> backfillHistory(ref));
    return saved;
  }

  public void backfillAllHistory() {
    String userId = authUtils.getCurrentUserId();
    List<StockHolding> holdings = stockRepository.findAllByUserId(userId);
    List<StockHolding> needsBackfill = holdings.stream().filter(h -> !h.isBackfilled()).toList();
    log.info("[Backfill] {}/{} holdings need backfill", needsBackfill.size(), holdings.size());
    for (StockHolding h : needsBackfill) {
      log.info("[Backfill] Queuing {} (id={})", h.getSymbol(), h.getId());
      final StockHolding ref = h;
      CompletableFuture.runAsync(() -> backfillHistory(ref));
    }
  }

  private void backfillHistory(StockHolding holding) {
    String symbol = holding.getSymbol();
    String currency = holding.getCurrency() != null ? holding.getCurrency() : "EUR";
    try {
      String startDate =
          holding.getBuyDate() != null
              ? holding.getBuyDate().toString()
              : LocalDate.now().minusYears(2).toString();
      log.info("[Backfill] {} — fetching history from {} in {}", symbol, startDate, currency);
      List<Map<String, Object>> history =
          stockPriceService.getStockHistory(symbol, startDate, currency);
      log.info(
          "[Backfill] {} — {} data points received, building records…", symbol, history.size());
      List<StockHoldingHistory> records = new ArrayList<>();
      for (Map<String, Object> entry : history) {
        StockHoldingHistory h = new StockHoldingHistory();
        h.setStockHoldingId(holding.getId());
        h.setUserId(holding.getUserId());
        h.setSymbol(symbol);
        h.setQuantity(holding.getQuantity());
        h.setBuyPrice(holding.getBuyPrice());
        h.setBuyDate(holding.getBuyDate());
        h.setCurrentPrice((Double) entry.get("price"));
        LocalDate date = LocalDate.parse((String) entry.get("date"));
        h.setUpdatedAt(date.atTime(23, 59, 59));
        records.add(h);
      }
      stockHoldingHistoryRepository.saveAll(records);
      holding.setBackfilled(true);
      stockRepository.save(holding);
      log.info("[Backfill] {} — done, saved {} daily records", symbol, records.size());
    } catch (Exception e) {
      log.error("[Backfill] {} — failed: {}", symbol, e.getMessage());
    }
  }

  public StockHolding updatePrice(String id, StockRequest req) {
    String userId = authUtils.getCurrentUserId();
    StockHolding stock =
        stockRepository.findById(id).orElseThrow(() -> new RuntimeException("Stock not found"));
    if (!userId.equals(stock.getUserId())) throw new RuntimeException("Access denied");
    stock.setCurrentPrice(req.getCurrentPrice());
    stock.setQuantity(req.getQuantity());
    stock.setBuyPrice(req.getBuyPrice());
    if (req.getCurrency() != null && !req.getCurrency().isBlank())
      stock.setCurrency(req.getCurrency());
    return stockRepository.save(stock);
  }

  public void deleteStock(String id) {
    String userId = authUtils.getCurrentUserId();
    stockRepository
        .findById(id)
        .ifPresent(
            stock -> {
              if (userId.equals(stock.getUserId())) stockRepository.deleteById(id);
            });
  }

  public PortfolioStats getPortfolioStats() {
    return getPortfolioStats(authUtils.getCurrentUserId());
  }

  public PortfolioStats getPortfolioStats(String userId) {
    List<StockHolding> holdings = stockRepository.findByUserIdAndSoldFalse(userId);
    double invested = 0;
    double current = 0;

    for (StockHolding s : holdings) {
      invested += s.getQuantity() * s.getBuyPrice();
      current += s.getQuantity() * s.getCurrentPrice();
    }

    return new PortfolioStats(invested, current, current - invested);
  }

  public Set<String> HoldingTickers() {
    return stockRepository.findAllByUserId(authUtils.getCurrentUserId()).stream()
        .map(StockHolding::getSymbol)
        .collect(Collectors.toSet());
  }

  public void updateHoldingCurrentPrice() {
    // Key = "SYMBOL|CURRENCY" so each symbol+currency pair is fetched independently
    HashMap<String, Double> tickerPriceMap = new HashMap<>();
    Set<String> symbolCurrencyKeys =
        stockRepository.findAll().stream()
            .filter(h -> !h.getSold() && h.getSymbol() != null && !h.getSymbol().isEmpty())
            .map(h -> h.getSymbol() + "|" + (h.getCurrency() != null ? h.getCurrency() : "EUR"))
            .collect(Collectors.toSet());

    // Use embedded Python service instead of HTTP calls
    for (String key : symbolCurrencyKeys) {
      String[] parts = key.split("\\|");
      String symbol = parts[0];
      String currency = parts[1];
      try {
        Map<String, Object> priceData = stockPriceService.getStockPrice(symbol, currency);
        double price = (double) priceData.get("price");
        log.debug("[StockUpdater] {} ({}) → {}", symbol, currency, price);
        tickerPriceMap.put(key, price);
      } catch (Exception e) {
        log.error(
            "[StockUpdater] Failed to fetch price for {} ({}): {}",
            symbol,
            currency,
            e.getMessage());
      }
    }

    List<StockHolding> allHoldings =
        stockRepository.findAll().stream()
            .filter(
                h -> {
                  String key =
                      h.getSymbol() + "|" + (h.getCurrency() != null ? h.getCurrency() : "EUR");
                  return tickerPriceMap.containsKey(key);
                })
            .toList();

    allHoldings.forEach(
        stockHolding -> {
          String key =
              stockHolding.getSymbol()
                  + "|"
                  + (stockHolding.getCurrency() != null ? stockHolding.getCurrency() : "EUR");
          double newPrice = tickerPriceMap.get(key);
          double oldPrice = stockHolding.getCurrentPrice();

          // Only update if price has changed
          if (Math.abs(newPrice - oldPrice) > 0.01) {
            stockHolding.setCurrentPrice(newPrice);
            log.info(
                "[StockUpdater] {} price updated: €{} → €{}",
                stockHolding.getSymbol(),
                oldPrice,
                newPrice);
            updateStockHolding(stockHolding);
          }
        });

    stockRepository.saveAll(allHoldings);
  }

  private void updateStockHolding(StockHolding holding) {
    // Save history
    StockHoldingHistory history = new StockHoldingHistory();
    history.setStockHoldingId(holding.getId());
    history.setUserId(holding.getUserId());
    history.setSymbol(holding.getSymbol());
    history.setQuantity(holding.getQuantity());
    history.setBuyPrice(holding.getBuyPrice());
    history.setBuyDate(holding.getBuyDate());
    history.setCurrentPrice(holding.getCurrentPrice());
    history.setUpdatedAt(LocalDateTime.now());
    stockHoldingHistoryRepository.save(history);
  }

  public CapitalGainsSummaryDTO getCapitalGains() {
    List<StockHolding> holdings =
        stockRepository.findByUserIdAndSoldFalse(authUtils.getCurrentUserId());

    List<CapitalGainsDTO> gains = new ArrayList<>();
    double totalUnrealizedGain = 0;
    double totalEstimatedTax = 0;

    for (StockHolding holding : holdings) {
      double invested = holding.getQuantity() * holding.getBuyPrice();
      double currentValue = holding.getQuantity() * holding.getCurrentPrice();
      double unrealizedGain = currentValue - invested;
      double estimatedTax = unrealizedGain > 0 ? unrealizedGain * GERMAN_TAX_RATE : 0;
      long holdingDays =
          holding.getBuyDate() != null
              ? ChronoUnit.DAYS.between(holding.getBuyDate(), LocalDate.now())
              : 0;

      gains.add(
          new CapitalGainsDTO(
              holding.getSymbol(),
              holding.getBuyPrice(),
              holding.getCurrentPrice(),
              holding.getQuantity(),
              unrealizedGain,
              GERMAN_TAX_RATE,
              estimatedTax,
              holdingDays));

      totalUnrealizedGain += unrealizedGain;
      if (unrealizedGain > 0) {
        totalEstimatedTax += estimatedTax;
      }
    }

    return new CapitalGainsSummaryDTO(gains, totalUnrealizedGain, totalEstimatedTax);
  }

  public PortfolioAllocationDTO getCurrentAllocation() {
    String userId = authUtils.getCurrentUserId();
    List<StockHolding> holdings = stockRepository.findByUserIdAndSoldFalse(userId);

    double totalValue =
        holdings.stream().mapToDouble(h -> h.getQuantity() * h.getCurrentPrice()).sum();

    // Get target allocations if they exist
    PortfolioTarget target = portfolioTargetRepository.findFirstByUserId(userId).orElse(null);
    Map<String, Double> targetAllocations =
        target != null ? target.getAllocations() : new HashMap<>();

    // Group by symbol and calculate allocations
    Map<String, Double> valueBySymbol =
        holdings.stream()
            .collect(
                Collectors.groupingBy(
                    StockHolding::getSymbol,
                    Collectors.summingDouble(h -> h.getQuantity() * h.getCurrentPrice())));

    List<AllocationDTO> allocations = new ArrayList<>();
    for (Map.Entry<String, Double> entry : valueBySymbol.entrySet()) {
      String symbol = entry.getKey();
      double value = entry.getValue();
      double percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      double targetPct = targetAllocations.getOrDefault(symbol, 0.0);
      double difference = percentage - targetPct;

      allocations.add(new AllocationDTO(symbol, value, percentage, targetPct, difference));
    }

    // Generate rebalancing suggestions
    Map<String, String> suggestions = new HashMap<>();
    for (AllocationDTO alloc : allocations) {
      if (alloc.getTargetPercentage() > 0) {
        double diff = alloc.getDifference();
        if (diff > 5) {
          suggestions.put(
              alloc.getSymbol(), String.format("Consider selling (%.1f%% over target)", diff));
        } else if (diff < -5) {
          suggestions.put(
              alloc.getSymbol(),
              String.format("Consider buying (%.1f%% under target)", Math.abs(diff)));
        }
      }
    }

    return new PortfolioAllocationDTO(allocations, totalValue, suggestions);
  }

  public PortfolioTarget getPortfolioTarget() {
    String userId = authUtils.getCurrentUserId();
    return portfolioTargetRepository.findFirstByUserId(userId).orElse(new PortfolioTarget());
  }

  public PortfolioTarget savePortfolioTarget(PortfolioTarget target) {
    String userId = authUtils.getCurrentUserId();
    target.setUserId(userId);
    // Only keep one target document per user
    List<PortfolioTarget> existing = portfolioTargetRepository.findAllByUserId(userId);
    if (!existing.isEmpty() && target.getId() == null) {
      target.setId(existing.get(0).getId());
    }
    return portfolioTargetRepository.save(target);
  }
}
