package dev.toolbox.controller;

import dev.toolbox.models.NetWorthSnapshot;
import dev.toolbox.services.NetWorthSnapshotService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/networth")
public class NetWorthController {

  @Autowired private NetWorthSnapshotService snapshotService;

  @GetMapping("/history")
  public ResponseEntity<List<NetWorthSnapshot>> getHistory() {
    return ResponseEntity.ok(snapshotService.getHistory());
  }

  @PostMapping("/snapshot")
  public ResponseEntity<NetWorthSnapshot> captureSnapshot() {
    return ResponseEntity.status(HttpStatus.CREATED).body(snapshotService.captureSnapshot());
  }

  @GetMapping("/latest")
  public ResponseEntity<NetWorthSnapshot> getLatest() {
    return snapshotService
        .getLatestSnapshot()
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }
}
