package dev.toolbox.controller;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.dto.TRImportPreviewDTO;
import dev.toolbox.services.TRImportService;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/invest/import/tr")
@CrossOrigin(origins = "*")
public class TRImportController {

  @Autowired private TRImportService trImportService;
  @Autowired private AuthUtils authUtils;

  @PostMapping("/preview")
  public ResponseEntity<?> preview(@RequestParam("pdf") MultipartFile pdf) {
    if (pdf == null || pdf.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No PDF"));
    try {
      return ResponseEntity.ok(trImportService.preview(pdf));
    } catch (Exception e) {
      log.error("[TRImport] Preview failed: {}", e.getMessage());
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/confirm")
  public ResponseEntity<?> confirm(@RequestBody TRImportPreviewDTO preview) {
    try {
      String userId = authUtils.getCurrentUserId();
      return ResponseEntity.ok(trImportService.confirm(userId, preview));
    } catch (Exception e) {
      log.error("[TRImport] Confirm failed: {}", e.getMessage());
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }
}
