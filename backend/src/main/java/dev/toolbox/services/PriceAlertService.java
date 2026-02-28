package dev.toolbox.services;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.AlertCondition;
import dev.toolbox.models.PriceAlert;
import dev.toolbox.models.StockHolding;
import dev.toolbox.models.StockHoldingHistory;
import dev.toolbox.models.StockWatch;
import dev.toolbox.repos.PriceAlertRepository;
import dev.toolbox.repos.StockHoldingHistoryRepository;
import dev.toolbox.repos.StockRepository;
import dev.toolbox.repos.StockWatchRepository;
import dev.toolbox.repos.UserRepo;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class PriceAlertService {

  @Autowired private PriceAlertRepository alertRepository;
  @Autowired private StockRepository stockRepository;
  @Autowired private StockWatchRepository watchRepository;
  @Autowired private StockHoldingHistoryRepository historyRepository;
  @Autowired private EmailService emailService;
  @Autowired private UserRepo userRepo;
  @Autowired private AuthUtils authUtils;

  public List<PriceAlert> getAllAlerts() {
    return alertRepository.findAllByUserId(authUtils.getCurrentUserId());
  }

  public List<PriceAlert> getActiveAlerts() {
    return alertRepository.findByActiveTrueAndUserId(authUtils.getCurrentUserId());
  }

  public PriceAlert getAlertById(String id) {
    String userId = authUtils.getCurrentUserId();
    PriceAlert alert =
        alertRepository
            .findById(id)
            .orElseThrow(() -> new RuntimeException("Price alert not found: " + id));
    if (!userId.equals(alert.getUserId())) throw new RuntimeException("Access denied");
    return alert;
  }

  public List<PriceAlert> getAlertsBySymbol(String symbol) {
    return alertRepository.findBySymbolAndUserId(symbol, authUtils.getCurrentUserId());
  }

  public PriceAlert createAlert(PriceAlert alert) {
    alert.setUserId(authUtils.getCurrentUserId());
    return alertRepository.save(alert);
  }

  public PriceAlert updateAlert(String id, PriceAlert updated) {
    PriceAlert existing = getAlertById(id);
    existing.setSymbol(updated.getSymbol());
    existing.setAlertCondition(updated.getAlertCondition());
    existing.setTargetPrice(updated.getTargetPrice());
    existing.setTargetPercent(updated.getTargetPercent());
    existing.setActive(updated.isActive());
    return alertRepository.save(existing);
  }

  public void deleteAlert(String id) {
    String userId = authUtils.getCurrentUserId();
    alertRepository
        .findById(id)
        .ifPresent(
            alert -> {
              if (userId.equals(alert.getUserId())) alertRepository.deleteById(id);
            });
  }

  public void checkAlerts() {
    List<PriceAlert> activeAlerts = alertRepository.findByActiveTrue();
    if (activeAlerts.isEmpty()) return;

    // Build price maps from portfolio holdings
    Map<String, StockHolding> holdingsBySymbol = new HashMap<>();
    for (StockHolding h : stockRepository.findAll()) {
      if (!h.getSold()) holdingsBySymbol.put(h.getSymbol(), h);
    }

    // Build price map from watchlist (currentPrice only)
    Map<String, StockWatch> watchBySymbol = new HashMap<>();
    for (StockWatch w : watchRepository.findAll()) {
      watchBySymbol.put(w.getSymbol(), w);
    }

    for (PriceAlert alert : activeAlerts) {
      AlertCondition condition = alert.effectiveCondition();
      if (condition == null) continue;

      String symbol = alert.getSymbol();
      StockHolding holding = holdingsBySymbol.get(symbol);
      StockWatch watch = watchBySymbol.get(symbol);

      // Resolve current price: portfolio takes precedence over watchlist
      double currentPrice =
          holding != null ? holding.getCurrentPrice() : (watch != null ? watch.getCurrentPrice() : 0);
      if (currentPrice == 0) continue;

      boolean triggered = false;
      String detail = "";

      switch (condition) {
        case PRICE_ABOVE:
          if (currentPrice >= alert.getTargetPrice()) {
            triggered = true;
            detail = String.format("rose above €%.2f → now €%.2f", alert.getTargetPrice(), currentPrice);
          }
          break;

        case PRICE_BELOW:
          if (currentPrice <= alert.getTargetPrice()) {
            triggered = true;
            detail = String.format("dropped below €%.2f → now €%.2f", alert.getTargetPrice(), currentPrice);
          }
          break;

        case DAILY_CHANGE_UP:
          if (holding != null && holding.getPreviousClose() > 0) {
            double pct = (currentPrice - holding.getPreviousClose()) / holding.getPreviousClose() * 100;
            if (pct >= alert.getTargetPercent()) {
              triggered = true;
              detail = String.format("up +%.2f%% today (target: +%.1f%%)", pct, alert.getTargetPercent());
            }
          }
          break;

        case DAILY_CHANGE_DOWN:
          if (holding != null && holding.getPreviousClose() > 0) {
            double pct = (holding.getPreviousClose() - currentPrice) / holding.getPreviousClose() * 100;
            if (pct >= alert.getTargetPercent()) {
              triggered = true;
              detail = String.format("down -%.2f%% today (target: -%.1f%%)", pct, alert.getTargetPercent());
            }
          }
          break;

        case PNL_UP:
          if (holding != null && holding.getBuyPrice() > 0) {
            double pct = (currentPrice - holding.getBuyPrice()) / holding.getBuyPrice() * 100;
            if (pct >= alert.getTargetPercent()) {
              triggered = true;
              detail = String.format("P&L +%.2f%% from buy (target: +%.1f%%)", pct, alert.getTargetPercent());
            }
          }
          break;

        case PNL_DOWN:
          if (holding != null && holding.getBuyPrice() > 0) {
            double pct = (holding.getBuyPrice() - currentPrice) / holding.getBuyPrice() * 100;
            if (pct >= alert.getTargetPercent()) {
              triggered = true;
              detail = String.format("P&L -%.2f%% from buy (target: -%.1f%%)", pct, alert.getTargetPercent());
            }
          }
          break;

        case WEEK_52_HIGH:
          if (holding != null) {
            LocalDateTime since = LocalDateTime.now().minusDays(365);
            List<StockHoldingHistory> history =
                historyRepository.findBySymbolAndUpdatedAtBetween(symbol, since, LocalDateTime.now());
            double high52 = history.stream().mapToDouble(StockHoldingHistory::getCurrentPrice).max().orElse(0);
            if (high52 > 0 && currentPrice >= high52) {
              triggered = true;
              detail = String.format("hit 52-week high €%.2f", currentPrice);
            }
          }
          break;

        case WEEK_52_LOW:
          if (holding != null) {
            LocalDateTime since = LocalDateTime.now().minusDays(365);
            List<StockHoldingHistory> history =
                historyRepository.findBySymbolAndUpdatedAtBetween(symbol, since, LocalDateTime.now());
            double low52 = history.stream().mapToDouble(StockHoldingHistory::getCurrentPrice).min().orElse(0);
            if (low52 > 0 && currentPrice <= low52) {
              triggered = true;
              detail = String.format("hit 52-week low €%.2f", currentPrice);
            }
          }
          break;
      }

      if (triggered) {
        alert.setTriggered(true);
        alert.setActive(false);
        alert.setTriggeredAt(Instant.now());
        alertRepository.save(alert);
        log.info("[PriceAlert] {} triggered for {}: {}", condition, symbol, detail);

        final String alertDetail = detail;
        try {
          userRepo
              .findById(alert.getUserId())
              .ifPresent(
                  user -> {
                    if (user.isEmailNotificationsEnabled()) {
                      emailService.sendPriceAlert(user.getEmail(), symbol, alertDetail, 0, currentPrice);
                      log.info("Sent alert email to {} for {}", user.getEmail(), symbol);
                    }
                  });
        } catch (Exception e) {
          log.error("Failed to send alert email: {}", e.getMessage());
        }
      }
    }
  }
}
