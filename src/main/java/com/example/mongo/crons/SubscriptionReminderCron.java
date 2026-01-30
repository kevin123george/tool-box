package com.example.mongo.crons;

import com.example.mongo.services.SubscriptionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SubscriptionReminderCron {

  @Autowired private SubscriptionService subscriptionService;

  // Run daily at 9 AM
  @Scheduled(cron = "0 0 9 * * *")
  public void checkRenewalReminders() {
    log.info("Running subscription reminder cron job...");
    try {
      subscriptionService.checkRenewalReminders();
      log.info("Subscription reminders checked successfully");
    } catch (Exception e) {
      log.error("Failed to check subscription reminders: {}", e.getMessage());
    }
  }
}
