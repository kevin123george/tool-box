package dev.toolbox.controller;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.dto.N26ImportPreviewDTO;
import dev.toolbox.models.dto.N26TransactionDTO;
import dev.toolbox.services.N26ImportService;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/finance/import/n26")
@CrossOrigin(origins = "*")
public class N26ImportController {

  @Autowired private N26ImportService n26ImportService;
  @Autowired private AuthUtils authUtils;

  /** POST /api/finance/import/n26/preview — parse PDF and return preview */
  @PostMapping("/preview")
  public ResponseEntity<?> preview(@RequestParam("pdf") MultipartFile pdf) {
    if (pdf == null || pdf.isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "No PDF file provided"));
    }

    try {
      N26ImportPreviewDTO preview = n26ImportService.previewPdf(pdf);
      return ResponseEntity.ok(preview);
    } catch (Exception e) {
      log.error("[N26Import] Preview failed: {}", e.getMessage());
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  /** POST /api/finance/import/n26/confirm — import selected transactions */
  @PostMapping("/confirm")
  public ResponseEntity<?> confirm(@RequestBody List<N26TransactionDTO> transactions) {
    if (transactions == null || transactions.isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "No transactions provided"));
    }

    try {
      String userId = authUtils.getCurrentUserId();
      int imported = n26ImportService.importTransactions(userId, transactions);
      return ResponseEntity.ok(Map.of("imported", imported));
    } catch (Exception e) {
      log.error("[N26Import] Confirm failed: {}", e.getMessage());
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }
}
