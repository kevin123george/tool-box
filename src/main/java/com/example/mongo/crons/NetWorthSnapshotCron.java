package com.example.mongo.crons;

import com.example.mongo.services.NetWorthSnapshotService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class NetWorthSnapshotCron {

  @Autowired private NetWorthSnapshotService snapshotService;

  // Run daily at 10 PM
  @Scheduled(cron = "0 0 22 * * *")
  public void captureNetWorthSnapshot() {
    log.info("Running net worth snapshot cron job...");
    try {
      snapshotService.captureSnapshot();
      log.info("Net worth snapshot captured successfully");
    } catch (Exception e) {
      log.error("Failed to capture net worth snapshot: {}", e.getMessage());
    }
  }
}
