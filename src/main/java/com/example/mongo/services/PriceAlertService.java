package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.AlertDirection;
import com.example.mongo.models.PriceAlert;
import com.example.mongo.models.StockHolding;
import com.example.mongo.repos.PriceAlertRepository;
import com.example.mongo.repos.StockRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class PriceAlertService {

  @Autowired private PriceAlertRepository alertRepository;

  @Autowired private StockRepository stockRepository;

  @Autowired private WebPushService webPushService;

  @Autowired private AuthUtils authUtils;

  public List<PriceAlert> getAllAlerts() {
    return alertRepository.findAllByUserId(authUtils.getCurrentUserId());
  }

  public List<PriceAlert> getActiveAlerts() {
    return alertRepository.findByActiveTrueAndUserId(authUtils.getCurrentUserId());
  }

  public PriceAlert getAlertById(String id) {
    return alertRepository
        .findById(id)
        .orElseThrow(() -> new RuntimeException("Price alert not found: " + id));
  }

  public List<PriceAlert> getAlertsBySymbol(String symbol) {
    return alertRepository.findBySymbol(symbol);
  }

  public PriceAlert createAlert(PriceAlert alert) {
    alert.setUserId(authUtils.getCurrentUserId());
    return alertRepository.save(alert);
  }

  public PriceAlert updateAlert(String id, PriceAlert updated) {
    PriceAlert existing = getAlertById(id);
    existing.setSymbol(updated.getSymbol());
    existing.setTargetPrice(updated.getTargetPrice());
    existing.setDirection(updated.getDirection());
    existing.setActive(updated.isActive());
    return alertRepository.save(existing);
  }

  public void deleteAlert(String id) {
    alertRepository.deleteById(id);
  }

  public void checkAlerts() {
    List<PriceAlert> activeAlerts = alertRepository.findByActiveTrue();
    if (activeAlerts.isEmpty()) return;

    // Get current prices from stock holdings
    Map<String, Double> currentPrices = new HashMap<>();
    for (StockHolding holding : stockRepository.findAll()) {
      if (!holding.getSold()) {
        currentPrices.put(holding.getSymbol(), holding.getCurrentPrice());
      }
    }

    for (PriceAlert alert : activeAlerts) {
      Double currentPrice = currentPrices.get(alert.getSymbol());
      if (currentPrice == null) continue;

      boolean triggered = false;
      if (alert.getDirection() == AlertDirection.ABOVE && currentPrice >= alert.getTargetPrice()) {
        triggered = true;
      } else if (alert.getDirection() == AlertDirection.BELOW
          && currentPrice <= alert.getTargetPrice()) {
        triggered = true;
      }

      if (triggered) {
        alert.setTriggered(true);
        alert.setActive(false);
        alert.setTriggeredAt(Instant.now());
        alertRepository.save(alert);

        // Send push notification
        String title = "Price Alert Triggered";
        String body =
            String.format(
                "%s is now €%.2f (%s €%.2f)",
                alert.getSymbol(),
                currentPrice,
                alert.getDirection() == AlertDirection.ABOVE ? "above" : "below",
                alert.getTargetPrice());

        Map<String, String> data = new HashMap<>();
        data.put("symbol", alert.getSymbol());
        data.put("currentPrice", String.valueOf(currentPrice));
        data.put("targetPrice", String.valueOf(alert.getTargetPrice()));

        try {
          webPushService.sendSystemAlert(title, body, "price_alert", data);
          log.info("Sent price alert notification for {}", alert.getSymbol());
        } catch (Exception e) {
          log.error("Failed to send price alert notification: {}", e.getMessage());
        }
      }
    }
  }
}
