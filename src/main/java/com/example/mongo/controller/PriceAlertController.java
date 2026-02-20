package com.example.mongo.controller;

import com.example.mongo.models.PriceAlert;
import com.example.mongo.services.PriceAlertService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/alerts")
public class PriceAlertController {

  @Autowired private PriceAlertService alertService;

  @GetMapping
  public ResponseEntity<List<PriceAlert>> getAllAlerts() {
    return ResponseEntity.ok(alertService.getAllAlerts());
  }

  @GetMapping("/active")
  public ResponseEntity<List<PriceAlert>> getActiveAlerts() {
    return ResponseEntity.ok(alertService.getActiveAlerts());
  }

  @GetMapping("/{id}")
  public ResponseEntity<PriceAlert> getAlertById(@PathVariable String id) {
    return ResponseEntity.ok(alertService.getAlertById(id));
  }

  @GetMapping("/symbol/{symbol}")
  public ResponseEntity<List<PriceAlert>> getAlertsBySymbol(@PathVariable String symbol) {
    return ResponseEntity.ok(alertService.getAlertsBySymbol(symbol));
  }

  @PostMapping
  public ResponseEntity<PriceAlert> createAlert(@RequestBody PriceAlert alert) {
    return ResponseEntity.status(HttpStatus.CREATED).body(alertService.createAlert(alert));
  }

  @PutMapping("/{id}")
  public ResponseEntity<PriceAlert> updateAlert(
      @PathVariable String id, @RequestBody PriceAlert alert) {
    return ResponseEntity.ok(alertService.updateAlert(id, alert));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteAlert(@PathVariable String id) {
    alertService.deleteAlert(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/check")
  public ResponseEntity<Void> checkAlerts() {
    alertService.checkAlerts();
    return ResponseEntity.ok().build();
  }
}
