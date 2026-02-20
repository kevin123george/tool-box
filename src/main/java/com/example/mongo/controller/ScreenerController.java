package com.example.mongo.controller;

import com.example.mongo.models.ScreenerEntry;
import com.example.mongo.models.dto.ScreenerFilterDTO;
import com.example.mongo.services.ScreenerService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/screener")
public class ScreenerController {

  @Autowired private ScreenerService screenerService;

  @GetMapping("/search")
  public ResponseEntity<Map<String, Object>> search(ScreenerFilterDTO filters) {
    return ResponseEntity.ok(screenerService.search(filters));
  }

  @PostMapping("/add/{symbol}")
  public ResponseEntity<ScreenerEntry> addSymbol(@PathVariable String symbol) {
    ScreenerEntry entry = screenerService.addSymbol(symbol);
    if (entry == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(entry);
  }

  @GetMapping("/sectors")
  public ResponseEntity<List<String>> getSectors() {
    return ResponseEntity.ok(screenerService.getSectors());
  }
}
