package dev.toolbox.services;

import dev.toolbox.models.MonthlyBudget;
import dev.toolbox.models.UsersEntity;
import dev.toolbox.repos.UserRepo;
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
  private final EmailService emailService;
  private final UserRepo userRepo;

  // Track last alert level sent per (userId, month) to avoid spam
  private Map<String, Integer> lastAlertLevel = new HashMap<>();

  public BudgetAlertService(
      MonthlyBudgetService budgetService, EmailService emailService, UserRepo userRepo) {
    this.budgetService = budgetService;
    this.emailService = emailService;
    this.userRepo = userRepo;
  }

  // Run daily at 8 PM (20:00)
  @Scheduled(cron = "0 0 20 * * *")
  public void checkBudgetThresholds() {
    log.info("[BudgetAlert] Running daily budget threshold check");
    YearMonth currentMonth = YearMonth.now();
    for (UsersEntity user : userRepo.findAll()) {
      if (!user.isEmailNotificationsEnabled()) continue;
      checkAndAlert(currentMonth, user.getId(), user.getEmail());
    }
  }

  public void checkAndAlert(YearMonth month, String userId, String userEmail) {
    try {
      MonthlyBudget budget = budgetService.getOrCreateBudget(month, userId);
      double adherence = budget.getBudgetAdherence();

      int alertLevel = getAlertLevel(adherence);
      String key = userId + ":" + month;
      int lastLevel = lastAlertLevel.getOrDefault(key, 0);

      if (alertLevel > lastLevel) {
        sendBudgetAlert(userEmail, adherence, alertLevel);
        lastAlertLevel.put(key, alertLevel);
      }
    } catch (Exception e) {
      log.error("[BudgetAlert] Error checking thresholds for user {}: {}", userId, e.getMessage());
    }
  }

  private int getAlertLevel(double adherence) {
    if (adherence >= 100) return 3;
    if (adherence >= 90) return 2;
    if (adherence >= 80) return 1;
    return 0;
  }

  private void sendBudgetAlert(String userEmail, double adherence, int level) {
    String title;
    String body;

    switch (level) {
      case 1:
        title = "Budget Alert: 80% Reached";
        body =
            String.format(
                "You've spent %.1f%% of your monthly budget. Consider slowing down!", adherence);
        break;
      case 2:
        title = "Budget Warning: 90% Reached";
        body =
            String.format(
                "You've spent %.1f%% of your monthly budget. Almost at the limit!", adherence);
        break;
      case 3:
        title = "Budget Exceeded!";
        body =
            String.format(
                "You've exceeded your monthly budget at %.1f%%. Time to review your expenses.",
                adherence);
        break;
      default:
        return;
    }

    try {
      emailService.send(
          userEmail,
          title,
          "<h2>"
              + title
              + "</h2><p>"
              + body
              + "</p>"
              + "<p><a href='/finance.html?tab=budget'>View Budget</a></p>");
      log.info("[BudgetAlert] Sent '{}' to {}", title, userEmail);
    } catch (Exception e) {
      log.error("[BudgetAlert] Failed to send alert: {}", e.getMessage());
    }
  }

  public void triggerManualCheck() {
    YearMonth month = YearMonth.now();
    for (UsersEntity user : userRepo.findAll()) {
      checkAndAlert(month, user.getId(), user.getEmail());
    }
  }

  public void resetAlertTracking(String userId, YearMonth month) {
    lastAlertLevel.remove(userId + ":" + month);
  }
}
