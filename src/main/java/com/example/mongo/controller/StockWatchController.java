package com.example.mongo.controller;

import com.example.mongo.models.StockWatch;
import com.example.mongo.services.StockWatchService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stocks-watch")
public class StockWatchController {

  private final StockWatchService stockWatchService;

  public StockWatchController(StockWatchService stockWatchService) {
    this.stockWatchService = stockWatchService;
  }

  @PostMapping
  public String addStock(@RequestBody StockWatch request) {
    return stockWatchService.addToWatchlist(request);
  }

  @GetMapping
  public List<StockWatch> getAllStocks() {
    return stockWatchService.getAllStocks();
  }

  @DeleteMapping("/{symbol}")
  public void deleteById(@PathVariable String symbol) {
    stockWatchService.deleteById(symbol);
  }
}
