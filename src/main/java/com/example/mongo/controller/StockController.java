package com.example.mongo.controller;

import com.example.mongo.models.StockHolding;
import com.example.mongo.models.dto.PortfolioStats;
import com.example.mongo.models.dto.StockRequest;
import com.example.mongo.services.StockService;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

  @GetMapping("/export")
  public ResponseEntity<String> exportCsv() {
    List<StockHolding> holdings =
        service.getAllStocks().stream().filter(i -> i.getSold() == false).toList();

    StringBuilder sb = new StringBuilder();
    sb.append("symbol,quantity,buyPrice,buyDate,currentPrice\n");
    for (StockHolding s : holdings) {
      sb.append(
          String.format(
              "%s,%.4f,%.2f,%s,%.2f\n",
              s.getSymbol(),
              s.getQuantity(),
              s.getBuyPrice(),
              s.getBuyDate() != null ? s.getBuyDate().toString() : "",
              s.getCurrentPrice()));
    }

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"portfolio.csv\"")
        .contentType(MediaType.parseMediaType("text/csv"))
        .body(sb.toString());
  }

  @PutMapping("/{id}")
  public ResponseEntity<StockHolding> updatePrice(
      @PathVariable String id, @RequestBody StockRequest stockRequest) {
    return ResponseEntity.ok(service.updatePrice(id, stockRequest));
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
