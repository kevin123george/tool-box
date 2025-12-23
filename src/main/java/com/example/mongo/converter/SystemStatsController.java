package com.example.mongo.converter;

import com.example.mongo.models.dto.SystemStatsDTO;
import com.example.mongo.services.SystemStatsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemStatsController {

  @Autowired private SystemStatsService statsService;

  @GetMapping("/stats")
  public ResponseEntity<SystemStatsDTO> getStats() {
    return ResponseEntity.ok(statsService.getSystemStats());
  }
}
