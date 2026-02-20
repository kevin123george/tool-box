package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.ExpenseCategory;
import com.example.mongo.models.ExpenseRecord;
import com.example.mongo.models.IncomeCategory;
import com.example.mongo.models.IncomeRecord;
import com.example.mongo.models.RecurringTransaction;
import com.example.mongo.models.TransactionFrequency;
import com.example.mongo.repos.RecurringTransactionRepository;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class RecurringTransactionService {

  @Autowired private RecurringTransactionRepository recurringRepository;

  @Autowired private MonthlyBudgetService budgetService;

  @Autowired private AuthUtils authUtils;

  public List<RecurringTransaction> getAllTransactions() {
    return recurringRepository.findAllByUserId(authUtils.getCurrentUserId());
  }

  public List<RecurringTransaction> getActiveTransactions() {
    return recurringRepository.findByActiveTrueAndUserId(authUtils.getCurrentUserId());
  }

  public RecurringTransaction getById(String id) {
    return recurringRepository
        .findById(id)
        .orElseThrow(() -> new RuntimeException("Recurring transaction not found: " + id));
  }

  public RecurringTransaction create(RecurringTransaction transaction) {
    transaction.setUserId(authUtils.getCurrentUserId());
    return recurringRepository.save(transaction);
  }

  public RecurringTransaction update(String id, RecurringTransaction updated) {
    RecurringTransaction existing = getById(id);
    existing.setName(updated.getName());
    existing.setAmount(updated.getAmount());
    existing.setCategory(updated.getCategory());
    existing.setCategoryType(updated.getCategoryType());
    existing.setFrequency(updated.getFrequency());
    existing.setNextDueDate(updated.getNextDueDate());
    existing.setActive(updated.isActive());
    return recurringRepository.save(existing);
  }

  public void delete(String id) {
    recurringRepository.deleteById(id);
  }

  public void processDueTransactions() {
    processDueTransactions(authUtils.getCurrentUserId());
  }

  public void processDueTransactions(String userId) {
    LocalDate today = LocalDate.now();
    List<RecurringTransaction> dueTransactions =
        recurringRepository.findByNextDueDateLessThanEqualAndActiveTrueAndUserId(today, userId);

    for (RecurringTransaction transaction : dueTransactions) {
      try {
        YearMonth month = YearMonth.from(transaction.getNextDueDate());

        if ("INCOME".equalsIgnoreCase(transaction.getCategory())) {
          IncomeCategory category = IncomeCategory.valueOf(transaction.getCategoryType());
          IncomeRecord record =
              new IncomeRecord(
                  category, transaction.getAmount(), "Auto: " + transaction.getName());
          budgetService.addIncome(month, record, userId);
        } else {
          ExpenseCategory category = ExpenseCategory.valueOf(transaction.getCategoryType());
          ExpenseRecord record =
              new ExpenseRecord(
                  category, transaction.getAmount(), "Auto: " + transaction.getName());
          budgetService.addExpense(month, record, userId);
        }

        // Advance to next due date
        transaction.setNextDueDate(transaction.calculateNextDueDate());
        recurringRepository.save(transaction);

        log.info("Processed recurring transaction: {}", transaction.getName());
      } catch (Exception e) {
        log.error("Failed to process recurring transaction {}: {}", transaction.getId(), e.getMessage());
      }
    }
  }

  public double getTotalMonthlyRecurringCost() {
    return recurringRepository.findByActiveTrueAndUserId(authUtils.getCurrentUserId()).stream()
        .filter(t -> "EXPENSE".equalsIgnoreCase(t.getCategory()))
        .mapToDouble(
            t -> {
              return switch (t.getFrequency()) {
                case WEEKLY -> t.getAmount() * 4.33;
                case MONTHLY -> t.getAmount();
                case YEARLY -> t.getAmount() / 12.0;
              };
            })
        .sum();
  }

  public double getTotalMonthlyRecurringIncome() {
    return recurringRepository.findByActiveTrueAndUserId(authUtils.getCurrentUserId()).stream()
        .filter(t -> "INCOME".equalsIgnoreCase(t.getCategory()))
        .mapToDouble(
            t -> {
              return switch (t.getFrequency()) {
                case WEEKLY -> t.getAmount() * 4.33;
                case MONTHLY -> t.getAmount();
                case YEARLY -> t.getAmount() / 12.0;
              };
            })
        .sum();
  }

  public List<RecurringTransaction> getTransactionsForMonth(int year, int month) {
    LocalDate start = LocalDate.of(year, month, 1);
    LocalDate end = start.plusMonths(1).minusDays(1);

    return recurringRepository.findByActiveTrueAndUserId(authUtils.getCurrentUserId()).stream()
        .filter(t -> {
          LocalDate due = t.getNextDueDate();
          return due != null && !due.isBefore(start) && !due.isAfter(end);
        })
        .toList();
  }
}
