package com.example.mongo.controller;

import com.example.mongo.models.RecurringTransaction;
import com.example.mongo.services.RecurringTransactionService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recurring")
public class RecurringTransactionController {

  @Autowired private RecurringTransactionService recurringService;

  @GetMapping
  public ResponseEntity<List<RecurringTransaction>> getAllTransactions() {
    return ResponseEntity.ok(recurringService.getAllTransactions());
  }

  @GetMapping("/active")
  public ResponseEntity<List<RecurringTransaction>> getActiveTransactions() {
    return ResponseEntity.ok(recurringService.getActiveTransactions());
  }

  @GetMapping("/{id}")
  public ResponseEntity<RecurringTransaction> getById(@PathVariable String id) {
    return ResponseEntity.ok(recurringService.getById(id));
  }

  @PostMapping
  public ResponseEntity<RecurringTransaction> create(
      @RequestBody RecurringTransaction transaction) {
    return ResponseEntity.status(HttpStatus.CREATED).body(recurringService.create(transaction));
  }

  @PutMapping("/{id}")
  public ResponseEntity<RecurringTransaction> update(
      @PathVariable String id, @RequestBody RecurringTransaction transaction) {
    return ResponseEntity.ok(recurringService.update(id, transaction));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    recurringService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/summary")
  public ResponseEntity<Map<String, Double>> getSummary() {
    return ResponseEntity.ok(
        Map.of(
            "monthlyRecurringCost", recurringService.getTotalMonthlyRecurringCost(),
            "monthlyRecurringIncome", recurringService.getTotalMonthlyRecurringIncome()));
  }

  @PostMapping("/process")
  public ResponseEntity<Void> processDueTransactions() {
    recurringService.processDueTransactions();
    return ResponseEntity.ok().build();
  }
}
