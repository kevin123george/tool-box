package dev.toolbox.crons;

import dev.toolbox.services.NetWorthSnapshotService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class NetWorthSnapshotCron {

  @Autowired private NetWorthSnapshotService snapshotService;

  @Autowired private dev.toolbox.repos.UserRepo userRepo;

  // Run daily at 10 PM
  @Scheduled(cron = "0 0 22 * * *")
  public void captureNetWorthSnapshot() {
    log.info("Running net worth snapshot cron job...");
    for (dev.toolbox.models.UsersEntity user : userRepo.findAll()) {
      try {
        snapshotService.captureSnapshot(user.getId());
        log.info("Net worth snapshot captured for user {}", user.getId());
      } catch (Exception e) {
        log.error(
            "Failed to capture net worth snapshot for user {}: {}", user.getId(), e.getMessage());
      }
    }
  }
}
