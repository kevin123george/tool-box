package dev.toolbox.crons;

import dev.toolbox.services.SubscriptionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SubscriptionReminderCron {

  @Autowired private SubscriptionService subscriptionService;

  @Autowired private dev.toolbox.repos.UserRepo userRepo;

  // Run daily at 9 AM
  @Scheduled(cron = "0 0 9 * * *")
  public void checkRenewalReminders() {
    log.info("Running subscription reminder cron job...");
    for (dev.toolbox.models.UsersEntity user : userRepo.findAll()) {
      try {
        subscriptionService.checkRenewalReminders(user.getId());
        log.info("Subscription reminders checked for user {}", user.getId());
      } catch (Exception e) {
        log.error(
            "Failed to check subscription reminders for user {}: {}", user.getId(), e.getMessage());
      }
    }
  }
}
