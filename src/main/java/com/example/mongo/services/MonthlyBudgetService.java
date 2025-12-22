package com.example.mongo.services;

import com.example.mongo.models.ExpenseCategory;
import com.example.mongo.models.ExpenseRecord;
import com.example.mongo.models.IncomeCategory;
import com.example.mongo.models.IncomeRecord;
import com.example.mongo.models.MonthlyBudget;
import com.example.mongo.repos.MonthlyBudgetRepository;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MonthlyBudgetService {

  @Autowired private MonthlyBudgetRepository monthlyBudgetRepository;

  private static final Set<ExpenseCategory> AUTO_CREATE_EXPENSE_CATEGORIES =
      Set.of(
          ExpenseCategory.RENT,
          ExpenseCategory.INTERNET,
          ExpenseCategory.SUBSCRIPTIONS,
          ExpenseCategory.TRANSPORT
          );

  public MonthlyBudget getOrCreateBudget(YearMonth month) {
    return monthlyBudgetRepository
        .findByMonth(month)
        .orElseGet(() -> monthlyBudgetRepository.save(new MonthlyBudget(month)));
  }

  public MonthlyBudget getBudget(YearMonth month) {
    return monthlyBudgetRepository
        .findByMonth(month)
        .orElseThrow(() -> new RuntimeException("Budget not found for month: " + month));
  }

  public List<MonthlyBudget> getAllBudgets() {
    return monthlyBudgetRepository.findAllByOrderByMonthDesc();
  }

  public void deleteBudget(YearMonth month) {
    MonthlyBudget budget = getBudget(month);
    monthlyBudgetRepository.delete(budget);
  }

  public MonthlyBudget setPlannedBudget(
      YearMonth month,
      Map<IncomeCategory, Double> plannedIncome,
      Map<ExpenseCategory, Double> plannedExpenses,
      boolean autoCreateRecords) {
    MonthlyBudget budget = getOrCreateBudget(month);

    if (plannedIncome != null) {
      budget.setPlannedIncome(plannedIncome);

      // Auto-create income records if requested
      if (autoCreateRecords) {
        plannedIncome.forEach(
            (category, amount) -> {
              if (amount > 0) {
                IncomeRecord record = new IncomeRecord(category, amount, "Planned " + category);
                budget.addIncomeRecord(record);
              }
            });
      }
    }

    if (plannedExpenses != null) {
      budget.setPlannedExpenses(plannedExpenses);

      // Auto-create expense records if requested
      if (autoCreateRecords) {
        plannedExpenses.forEach(
            (category, amount) -> {
              if (amount > 0 && AUTO_CREATE_EXPENSE_CATEGORIES.contains(category)) {
                ExpenseRecord record = new ExpenseRecord(category, amount, "Planned " + category);
                budget.addExpenseRecord(record);
              }
            });
      }
    }

    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget setPlannedIncome(
      YearMonth month, Map<IncomeCategory, Double> plannedIncome) {
    MonthlyBudget budget = getOrCreateBudget(month);
    budget.setPlannedIncome(plannedIncome);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget setPlannedExpenses(
      YearMonth month, Map<ExpenseCategory, Double> plannedExpenses) {
    MonthlyBudget budget = getOrCreateBudget(month);
    budget.setPlannedExpenses(plannedExpenses);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget addIncome(YearMonth month, IncomeRecord income) {
    MonthlyBudget budget = getOrCreateBudget(month);
    budget.addIncomeRecord(income);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget removeIncome(YearMonth month, int index) {
    MonthlyBudget budget = getBudget(month);
    budget.removeIncomeRecord(index);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget addExpense(YearMonth month, ExpenseRecord expense) {
    MonthlyBudget budget = getOrCreateBudget(month);
    budget.addExpenseRecord(expense);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget removeExpense(YearMonth month, int index) {
    MonthlyBudget budget = getBudget(month);
    budget.removeExpenseRecord(index);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget updateNotes(YearMonth month, String notes) {
    MonthlyBudget budget = getOrCreateBudget(month);
    budget.setNotes(notes);
    return monthlyBudgetRepository.save(budget);
  }
}
