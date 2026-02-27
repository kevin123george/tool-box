package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.AlertDirection;
import com.example.mongo.models.PriceAlert;
import com.example.mongo.models.StockHolding;
import com.example.mongo.models.UsersEntity;
import com.example.mongo.repos.PriceAlertRepository;
import com.example.mongo.repos.StockRepository;
import com.example.mongo.repos.UserRepo;
import java.time.Instant;
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
    existing.setTargetPrice(updated.getTargetPrice());
    existing.setDirection(updated.getDirection());
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

        // Send email notification
        String direction = alert.getDirection() == AlertDirection.ABOVE ? "above" : "below";
        try {
          String userEmail =
              userRepo.findById(alert.getUserId()).map(UsersEntity::getEmail).orElse(null);
          emailService.sendPriceAlert(
              userEmail, alert.getSymbol(), direction, alert.getTargetPrice(), currentPrice);
          log.info("Sent price alert email for {}", alert.getSymbol());
        } catch (Exception e) {
          log.error("Failed to send price alert email: {}", e.getMessage());
        }
      }
    }
  }
}
