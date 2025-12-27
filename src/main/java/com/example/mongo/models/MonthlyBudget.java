package com.example.mongo.models;

import java.time.Instant;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "monthly_budgets")
public class MonthlyBudget {

  @Id private String id;

  private YearMonth month;

  // Planned amounts
  private Map<IncomeCategory, Double> plannedIncome = new HashMap<>();
  private Map<ExpenseCategory, Double> plannedExpenses = new HashMap<>();

  // Actual records (embedded)
  private List<IncomeRecord> incomeRecords = new ArrayList<>();
  private List<ExpenseRecord> expenseRecords = new ArrayList<>();

  private String notes;

  @LastModifiedDate private Instant lastModified;
  @CreatedDate private Instant createdAt;

  public MonthlyBudget() {}

  public MonthlyBudget(YearMonth month) {
    this.month = month;
  }

  // === Record Management Methods ===

  public void addIncomeRecord(IncomeRecord record) {
    if (record.getRecordDate() == null) {
      record.setRecordDate(Instant.now());
    }
    incomeRecords.add(record);
  }

  public void addExpenseRecord(ExpenseRecord record) {
    if (record.getRecordDate() == null) {
      record.setRecordDate(Instant.now());
    }
    expenseRecords.add(record);
  }

  public void removeIncomeRecord(int index) {
    if (index >= 0 && index < incomeRecords.size()) {
      incomeRecords.remove(index);
    }
  }

  public void removeExpenseRecord(int index) {
    if (index >= 0 && index < expenseRecords.size()) {
      expenseRecords.remove(index);
    }
  }

  // === Computed Fields - Actual Totals ===

  public Map<IncomeCategory, Double> getIncomeByCategory() {
    return incomeRecords.stream()
        .collect(
            Collectors.groupingBy(
                IncomeRecord::getCategory, Collectors.summingDouble(IncomeRecord::getAmount)));
  }

  public Map<ExpenseCategory, Double> getExpensesByCategory() {
    return expenseRecords.stream()
        .collect(
            Collectors.groupingBy(
                ExpenseRecord::getCategory, Collectors.summingDouble(ExpenseRecord::getAmount)));
  }

  public double getTotalIncome() {
    return incomeRecords.stream().mapToDouble(IncomeRecord::getAmount).sum();
  }

  public double getTotalExpenses() {
    return expenseRecords.stream().mapToDouble(ExpenseRecord::getAmount).sum();
  }

  // === Planned Totals ===

  public double getTotalPlannedIncome() {
    return plannedIncome.values().stream().mapToDouble(Double::doubleValue).sum();
  }

  public double getTotalPlannedExpenses() {
    return plannedExpenses.values().stream().mapToDouble(Double::doubleValue).sum();
  }

  // === Remaining Amounts (Your Savings!) ===

  public double getRemaining() {
    return getTotalIncome() - getTotalExpenses();
  }

  public double getPlannedRemaining() {
    return getTotalPlannedIncome() - getTotalPlannedExpenses();
  }

  // === Savings Rate ===

  public double getSavingsRate() {
    double totalIncome = getTotalIncome();
    return totalIncome > 0 ? (getRemaining() / totalIncome) * 100 : 0;
  }

  public double getPlannedSavingsRate() {
    double plannedIncome = getTotalPlannedIncome();
    return plannedIncome > 0 ? (getPlannedRemaining() / plannedIncome) * 100 : 0;
  }

  // === Variance Analysis ===

  public Map<ExpenseCategory, Double> getExpenseVariance() {
    Map<ExpenseCategory, Double> variance = new HashMap<>();
    Map<ExpenseCategory, Double> actualByCategory = getExpensesByCategory();

    plannedExpenses.forEach(
        (category, planned) -> {
          double actual = actualByCategory.getOrDefault(category, 0.0);
          variance.put(category, actual - planned); // positive = overspent
        });

    return variance;
  }

  public Map<IncomeCategory, Double> getIncomeVariance() {
    Map<IncomeCategory, Double> variance = new HashMap<>();
    Map<IncomeCategory, Double> actualByCategory = getIncomeByCategory();

    plannedIncome.forEach(
        (category, planned) -> {
          double actual = actualByCategory.getOrDefault(category, 0.0);
          variance.put(category, actual - planned); // positive = earned more
        });

    return variance;
  }

  public List<IncomeRecord> getIncomeRecords() {
    return incomeRecords.stream()
        .sorted(
            Comparator.comparing(
                IncomeRecord::getRecordDate, Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
  }

  public List<ExpenseRecord> getExpenseRecords() {
    return expenseRecords.stream()
        .sorted(
            Comparator.comparing(
                ExpenseRecord::getRecordDate, Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
  }

  // === Budget Adherence ===

  public double getBudgetAdherence() {
    double plannedTotal = getTotalPlannedExpenses();
    if (plannedTotal == 0) return 100.0;

    double actualTotal = getTotalExpenses();
    return (actualTotal / plannedTotal) * 100;
  }
}
