package com.example.mongo.controller;

import com.example.mongo.models.StockHolding;
import com.example.mongo.models.dto.PortfolioStats;
import com.example.mongo.models.dto.StockRequest;
import com.example.mongo.services.StockService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stocks")
public class StockController {

  private final StockService service;

  public StockController(StockService service) {
    this.service = service;
  }

  @PostMapping
  public ResponseEntity<StockHolding> addStock(@RequestBody StockRequest req) {
    return ResponseEntity.ok(service.addStock(req));
  }

  @GetMapping
  public ResponseEntity<List<StockHolding>> getAllStocks() {
    return ResponseEntity.ok(
        service.getAllStocks().stream().filter(i -> i.getSold() == false).toList());
  }

  @PutMapping("/{id}")
  public ResponseEntity<StockHolding> updatePrice(
      @PathVariable String id, @RequestParam double currentPrice) {
    return ResponseEntity.ok(service.updatePrice(id, currentPrice));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteStock(@PathVariable String id) {
    service.deleteStock(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/stats")
  public ResponseEntity<PortfolioStats> getStats() {
    return ResponseEntity.ok(service.getPortfolioStats());
  }
}
