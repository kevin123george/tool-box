package dev.toolbox.crons;

import dev.toolbox.services.RecurringTransactionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class RecurringTransactionCron {

  @Autowired private RecurringTransactionService recurringService;

  @Autowired private dev.toolbox.repos.UserRepo userRepo;

  // Run daily at 1 AM
  @Scheduled(cron = "0 0 1 * * *")
  public void processDueTransactions() {
    log.info("Running recurring transaction cron job...");
    for (dev.toolbox.models.UsersEntity user : userRepo.findAll()) {
      try {
        recurringService.processDueTransactions(user.getId());
        log.info("Processed recurring transactions for user {}", user.getId());
      } catch (Exception e) {
        log.error(
            "Failed to process recurring transactions for user {}: {}",
            user.getId(),
            e.getMessage());
      }
    }
  }
}
