package com.example.mongo.crons;

import com.example.mongo.services.RecurringTransactionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class RecurringTransactionCron {

  @Autowired private RecurringTransactionService recurringService;

  // Run daily at 1 AM
  @Scheduled(cron = "0 0 1 * * *")
  public void processDueTransactions() {
    log.info("Running recurring transaction cron job...");
    try {
      recurringService.processDueTransactions();
      log.info("Recurring transactions processed successfully");
    } catch (Exception e) {
      log.error("Failed to process recurring transactions: {}", e.getMessage());
    }
  }
}
