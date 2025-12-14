package com.example.mongo.controller;

import com.example.mongo.services.StockPriceService;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stock")
public class StockPriceController {

  @Autowired private StockPriceService stockPriceService;

  @GetMapping
  public ResponseEntity<?> getStockPrice(
      @RequestParam String ticker,
      @RequestParam(required = false, defaultValue = "USD") String currency) {
    try {
      Map<String, Object> result = stockPriceService.getStockPrice(ticker, currency);
      return ResponseEntity.ok(result);
    } catch (Exception e) {
      return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
    }
  }
}
