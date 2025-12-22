package com.example.mongo.controller;

import com.example.mongo.models.ExpenseCategory;
import com.example.mongo.models.ExpenseRecord;
import com.example.mongo.models.IncomeCategory;
import com.example.mongo.models.IncomeRecord;
import com.example.mongo.models.MonthlyBudget;
import com.example.mongo.services.MonthlyBudgetService;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/budget")
@CrossOrigin(origins = "*")
public class MonthlyBudgetController {

  @Autowired private MonthlyBudgetService budgetService;

  // Get budget for specific month (creates if doesn't exist)
  @GetMapping("/{year}/{month}")
  public ResponseEntity<MonthlyBudget> getBudget(@PathVariable int year, @PathVariable int month) {
    YearMonth yearMonth = YearMonth.of(year, month);
    // Changed: use getOrCreateBudget instead of getBudget
    return ResponseEntity.ok(budgetService.getOrCreateBudget(yearMonth));
  }

  // Get all budgets (history)
  @GetMapping
  public ResponseEntity<List<MonthlyBudget>> getAllBudgets() {
    return ResponseEntity.ok(budgetService.getAllBudgets());
  }

  // Delete entire budget
  @DeleteMapping("/{year}/{month}")
  public ResponseEntity<Void> deleteBudget(@PathVariable int year, @PathVariable int month) {
    YearMonth yearMonth = YearMonth.of(year, month);
    try {
      budgetService.deleteBudget(yearMonth);
      return ResponseEntity.noContent().build();
    } catch (RuntimeException e) {
      return ResponseEntity.notFound().build();
    }
  }

  // Set planned budget for a month
  @PostMapping("/{year}/{month}/planned")
  public ResponseEntity<MonthlyBudget> setPlannedBudget(
      @PathVariable int year, @PathVariable int month, @RequestBody PlannedBudgetRequest request) {
    YearMonth yearMonth = YearMonth.of(year, month);
    return ResponseEntity.ok(
        budgetService.setPlannedBudget(
            yearMonth,
            request.getPlannedIncome(),
            request.getPlannedExpenses(),
            request.isAutoCreateRecords()));
  }

  // Set planned income only
  @PostMapping("/{year}/{month}/planned-income")
  public ResponseEntity<MonthlyBudget> setPlannedIncome(
      @PathVariable int year,
      @PathVariable int month,
      @RequestBody Map<IncomeCategory, Double> plannedIncome) {
    YearMonth yearMonth = YearMonth.of(year, month);
    return ResponseEntity.ok(budgetService.setPlannedIncome(yearMonth, plannedIncome));
  }

  // Set planned expenses only
  @PostMapping("/{year}/{month}/planned-expenses")
  public ResponseEntity<MonthlyBudget> setPlannedExpenses(
      @PathVariable int year,
      @PathVariable int month,
      @RequestBody Map<ExpenseCategory, Double> plannedExpenses) {
    YearMonth yearMonth = YearMonth.of(year, month);
    return ResponseEntity.ok(budgetService.setPlannedExpenses(yearMonth, plannedExpenses));
  }

  // Add income record
  @PostMapping("/{year}/{month}/income")
  public ResponseEntity<MonthlyBudget> addIncome(
      @PathVariable int year, @PathVariable int month, @RequestBody IncomeRecord income) {
    YearMonth yearMonth = YearMonth.of(year, month);
    return ResponseEntity.ok(budgetService.addIncome(yearMonth, income));
  }

  // Delete income record by index
  @DeleteMapping("/{year}/{month}/income/{index}")
  public ResponseEntity<MonthlyBudget> removeIncome(
      @PathVariable int year, @PathVariable int month, @PathVariable int index) {
    YearMonth yearMonth = YearMonth.of(year, month);
    return ResponseEntity.ok(budgetService.removeIncome(yearMonth, index));
  }

  // Add expense record
  @PostMapping("/{year}/{month}/expenses")
  public ResponseEntity<MonthlyBudget> addExpense(
      @PathVariable int year, @PathVariable int month, @RequestBody ExpenseRecord expense) {
    YearMonth yearMonth = YearMonth.of(year, month);
    return ResponseEntity.ok(budgetService.addExpense(yearMonth, expense));
  }

  // Delete expense record by index
  @DeleteMapping("/{year}/{month}/expenses/{index}")
  public ResponseEntity<MonthlyBudget> removeExpense(
      @PathVariable int year, @PathVariable int month, @PathVariable int index) {
    YearMonth yearMonth = YearMonth.of(year, month);
    return ResponseEntity.ok(budgetService.removeExpense(yearMonth, index));
  }

  // Update notes
  @PutMapping("/{year}/{month}/notes")
  public ResponseEntity<MonthlyBudget> updateNotes(
      @PathVariable int year, @PathVariable int month, @RequestBody NotesRequest request) {
    YearMonth yearMonth = YearMonth.of(year, month);
    return ResponseEntity.ok(budgetService.updateNotes(yearMonth, request.getNotes()));
  }

  // Helper Classes
  @Data
  public static class PlannedBudgetRequest {
    private Map<IncomeCategory, Double> plannedIncome;
    private Map<ExpenseCategory, Double> plannedExpenses;
    private boolean autoCreateRecords = true; // Default to true
  }

  @Data
  public static class NotesRequest {
    private String notes;
  }
}
