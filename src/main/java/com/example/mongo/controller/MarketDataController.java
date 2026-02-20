package com.example.mongo.controller;

import com.example.mongo.services.MarketDataService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/market")
public class MarketDataController {

  @Autowired private MarketDataService marketDataService;

  @GetMapping("/search")
  public List<Map<String, Object>> searchTickers(@RequestParam String q) {
    return marketDataService.searchTickers(q);
  }

  @GetMapping("/ohlc/{symbol}")
  public List<Map<String, Object>> getOHLC(
      @PathVariable String symbol,
      @RequestParam(defaultValue = "6mo") String period,
      @RequestParam(defaultValue = "1d") String interval) {
    return marketDataService.getOHLCDataRaw(symbol, period, interval);
  }
}
