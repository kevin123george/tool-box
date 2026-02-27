package dev.toolbox.controller;

import dev.toolbox.models.DividendRecord;
import dev.toolbox.models.dto.DividendSummaryDTO;
import dev.toolbox.services.DividendService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dividends")
public class DividendController {

  @Autowired private DividendService dividendService;

  @GetMapping
  public ResponseEntity<List<DividendRecord>> getAllDividends() {
    return ResponseEntity.ok(dividendService.getAllDividends());
  }

  @GetMapping("/{id}")
  public ResponseEntity<DividendRecord> getDividendById(@PathVariable String id) {
    return ResponseEntity.ok(dividendService.getDividendById(id));
  }

  @GetMapping("/symbol/{symbol}")
  public ResponseEntity<List<DividendRecord>> getDividendsBySymbol(@PathVariable String symbol) {
    return ResponseEntity.ok(dividendService.getDividendsBySymbol(symbol));
  }

  @PostMapping
  public ResponseEntity<DividendRecord> createDividend(@RequestBody DividendRecord record) {
    return ResponseEntity.status(HttpStatus.CREATED).body(dividendService.createDividend(record));
  }

  @PutMapping("/{id}")
  public ResponseEntity<DividendRecord> updateDividend(
      @PathVariable String id, @RequestBody DividendRecord record) {
    return ResponseEntity.ok(dividendService.updateDividend(id, record));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteDividend(@PathVariable String id) {
    dividendService.deleteDividend(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/summary")
  public ResponseEntity<DividendSummaryDTO> getSummary() {
    return ResponseEntity.ok(dividendService.getSummary());
  }

  @GetMapping("/projection")
  public ResponseEntity<DividendSummaryDTO> getProjection() {
    return ResponseEntity.ok(dividendService.getSummary());
  }
}
