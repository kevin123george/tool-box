package com.example.mongo.services;

import com.example.mongo.models.MonthlyBudget;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class BudgetAlertService {

  private final MonthlyBudgetService budgetService;
  private final WebPushService webPushService;

  // Track last alert level sent to avoid spam
  private Map<YearMonth, Integer> lastAlertLevelByMonth = new HashMap<>();

  public BudgetAlertService(MonthlyBudgetService budgetService, WebPushService webPushService) {
    this.budgetService = budgetService;
    this.webPushService = webPushService;
  }

  // Run daily at 8 PM (20:00)
  @Scheduled(cron = "0 0 20 * * *")
  public void checkBudgetThresholds() {
    log.info("[BudgetAlert] Running daily budget threshold check");
    YearMonth currentMonth = YearMonth.now();
    checkAndAlert(currentMonth);
  }

  public void checkAndAlert(YearMonth month) {
    try {
      MonthlyBudget budget = budgetService.getOrCreateBudget(month);
      double adherence = budget.getBudgetAdherence();

      int alertLevel = getAlertLevel(adherence);
      int lastLevel = lastAlertLevelByMonth.getOrDefault(month, 0);

      // Only send alert if we crossed a new threshold
      if (alertLevel > lastLevel) {
        sendBudgetAlert(adherence, alertLevel);
        lastAlertLevelByMonth.put(month, alertLevel);
      }
    } catch (Exception e) {
      log.error("[BudgetAlert] Error checking thresholds: {}", e.getMessage());
    }
  }

  private int getAlertLevel(double adherence) {
    if (adherence >= 100) return 3; // Over budget
    if (adherence >= 90) return 2; // 90% threshold
    if (adherence >= 80) return 1; // 80% threshold
    return 0; // Under 80%
  }

  private void sendBudgetAlert(double adherence, int level) {
    String title;
    String body;
    String type;

    switch (level) {
      case 1:
        title = "Budget Alert: 80% Reached";
        body =
            String.format(
                "You've spent %.1f%% of your monthly budget. Consider slowing down!", adherence);
        type = "warning";
        break;
      case 2:
        title = "Budget Warning: 90% Reached";
        body =
            String.format(
                "You've spent %.1f%% of your monthly budget. Almost at the limit!", adherence);
        type = "warning";
        break;
      case 3:
        title = "Budget Exceeded!";
        body =
            String.format(
                "You've exceeded your monthly budget at %.1f%%. Time to review your expenses.",
                adherence);
        type = "error";
        break;
      default:
        return;
    }

    Map<String, String> data = new HashMap<>();
    data.put("adherence", String.valueOf(adherence));
    data.put("level", String.valueOf(level));
    data.put("url", "/budget");

    try {
      webPushService.sendNotificationToAll(title, body, type);
      log.info("[BudgetAlert] Sent: {}", title);
    } catch (Exception e) {
      log.error("[BudgetAlert] Failed to send alert: {}", e.getMessage());
    }
  }

  // Manual trigger for testing
  public void triggerManualCheck() {
    checkAndAlert(YearMonth.now());
  }

  // Reset alert tracking for a new month (called at month start)
  public void resetAlertTracking(YearMonth month) {
    lastAlertLevelByMonth.remove(month);
  }
}
