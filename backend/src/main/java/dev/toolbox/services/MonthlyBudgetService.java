package dev.toolbox.services;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.controller.MonthlyBudgetController.BudgetComparisonDTO;
import dev.toolbox.models.ExpenseCategory;
import dev.toolbox.models.ExpenseRecord;
import dev.toolbox.models.IncomeCategory;
import dev.toolbox.models.IncomeRecord;
import dev.toolbox.models.MonthlyBudget;
import dev.toolbox.models.dto.SavingsRateDTO;
import dev.toolbox.repos.MonthlyBudgetRepository;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MonthlyBudgetService {

  @Autowired private MonthlyBudgetRepository monthlyBudgetRepository;
  @Autowired private AuthUtils authUtils;

  private static final Set<ExpenseCategory> AUTO_CREATE_EXPENSE_CATEGORIES =
      Set.of(
          ExpenseCategory.RENT,
          ExpenseCategory.INTERNET,
          ExpenseCategory.SUBSCRIPTIONS,
          ExpenseCategory.TRANSPORT);

  private static final Set<IncomeCategory> AUTO_CREATE_INCOME_CATEGORIES =
      Set.of(IncomeCategory.SALARY);

  public MonthlyBudget getOrCreateBudget(YearMonth month) {
    return getOrCreateBudget(month, authUtils.getCurrentUserId());
  }

  public MonthlyBudget getOrCreateBudget(YearMonth month, String userId) {
    return monthlyBudgetRepository
        .findByMonthAndUserId(month, userId)
        .orElseGet(
            () -> {
              MonthlyBudget b = new MonthlyBudget(month);
              b.setUserId(userId);
              return monthlyBudgetRepository.save(b);
            });
  }

  public MonthlyBudget getBudget(YearMonth month) {
    return getBudget(month, authUtils.getCurrentUserId());
  }

  public MonthlyBudget getBudget(YearMonth month, String userId) {
    return monthlyBudgetRepository
        .findByMonthAndUserId(month, userId)
        .orElseThrow(() -> new RuntimeException("Budget not found for month: " + month));
  }

  public List<MonthlyBudget> getAllBudgets() {
    return monthlyBudgetRepository.findAllByUserIdOrderByMonthDesc(authUtils.getCurrentUserId());
  }

  public void deleteBudget(YearMonth month) {
    MonthlyBudget budget = getBudget(month, authUtils.getCurrentUserId());
    monthlyBudgetRepository.delete(budget);
  }

  public int deleteAllBudgets() {
    List<MonthlyBudget> all =
        monthlyBudgetRepository.findAllByUserIdOrderByMonthDesc(authUtils.getCurrentUserId());
    monthlyBudgetRepository.deleteAll(all);
    return all.size();
  }

  public MonthlyBudget setPlannedBudget(
      YearMonth month,
      Map<IncomeCategory, Double> plannedIncome,
      Map<ExpenseCategory, Double> plannedExpenses,
      boolean autoCreateRecords) {
    MonthlyBudget budget = getOrCreateBudget(month, authUtils.getCurrentUserId());

    if (plannedIncome != null) {
      budget.setPlannedIncome(plannedIncome);

      // Auto-create income records ONLY if they don't already exist
      if (autoCreateRecords) {
        plannedIncome.forEach(
            (category, amount) -> {
              if (amount > 0 && AUTO_CREATE_INCOME_CATEGORIES.contains(category)) {
                // Check if record already exists for this category
                boolean exists =
                    budget.getIncomeRecords().stream()
                        .anyMatch(
                            r ->
                                r.getCategory() == category
                                    && r.getDescription().equals("Auto-created from plan"));

                if (!exists) {
                  IncomeRecord record =
                      new IncomeRecord(category, amount, "Auto-created from plan");
                  budget.addIncomeRecord(record);
                } else {
                  // Update existing auto-created record
                  budget.getIncomeRecords().stream()
                      .filter(
                          r ->
                              r.getCategory() == category
                                  && r.getDescription().equals("Auto-created from plan"))
                      .findFirst()
                      .ifPresent(r -> r.setAmount(amount));
                }
              }
            });
      }
    }

    if (plannedExpenses != null) {
      budget.setPlannedExpenses(plannedExpenses);

      // Auto-create expense records ONLY if they don't already exist
      if (autoCreateRecords) {
        plannedExpenses.forEach(
            (category, amount) -> {
              if (amount > 0 && AUTO_CREATE_EXPENSE_CATEGORIES.contains(category)) {
                // Check if record already exists for this category
                boolean exists =
                    budget.getExpenseRecords().stream()
                        .anyMatch(
                            r ->
                                r.getCategory() == category
                                    && r.getDescription().equals("Auto-created from plan"));

                if (!exists) {
                  ExpenseRecord record =
                      new ExpenseRecord(category, amount, "Auto-created from plan");
                  budget.addExpenseRecord(record);
                } else {
                  // Update existing auto-created record
                  budget.getExpenseRecords().stream()
                      .filter(
                          r ->
                              r.getCategory() == category
                                  && r.getDescription().equals("Auto-created from plan"))
                      .findFirst()
                      .ifPresent(r -> r.setAmount(amount));
                }
              }
            });
      }
    }

    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget setPlannedIncome(
      YearMonth month, Map<IncomeCategory, Double> plannedIncome) {
    MonthlyBudget budget = getOrCreateBudget(month, authUtils.getCurrentUserId());
    budget.setPlannedIncome(plannedIncome);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget setPlannedExpenses(
      YearMonth month, Map<ExpenseCategory, Double> plannedExpenses) {
    MonthlyBudget budget = getOrCreateBudget(month, authUtils.getCurrentUserId());
    budget.setPlannedExpenses(plannedExpenses);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget addIncome(YearMonth month, IncomeRecord income) {
    return addIncome(month, income, authUtils.getCurrentUserId());
  }

  public MonthlyBudget addIncome(YearMonth month, IncomeRecord income, String userId) {
    MonthlyBudget budget = getOrCreateBudget(month, userId);
    budget.addIncomeRecord(income);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget removeIncome(YearMonth month, int index) {
    MonthlyBudget budget = getBudget(month, authUtils.getCurrentUserId());
    budget.removeIncomeRecord(index);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget addExpense(YearMonth month, ExpenseRecord expense) {
    return addExpense(month, expense, authUtils.getCurrentUserId());
  }

  public MonthlyBudget addExpense(YearMonth month, ExpenseRecord expense, String userId) {
    MonthlyBudget budget = getOrCreateBudget(month, userId);
    budget.addExpenseRecord(expense);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget removeExpense(YearMonth month, int index) {
    MonthlyBudget budget = getBudget(month, authUtils.getCurrentUserId());
    budget.removeExpenseRecord(index);
    return monthlyBudgetRepository.save(budget);
  }

  public MonthlyBudget updateNotes(YearMonth month, String notes) {
    MonthlyBudget budget = getOrCreateBudget(month, authUtils.getCurrentUserId());
    budget.setNotes(notes);
    return monthlyBudgetRepository.save(budget);
  }

  public List<BudgetComparisonDTO> getBudgetComparison(int months) {
    List<BudgetComparisonDTO> comparisons = new ArrayList<>();
    YearMonth current = YearMonth.now();
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");
    String userId = authUtils.getCurrentUserId();

    for (int i = months - 1; i >= 0; i--) {
      YearMonth targetMonth = current.minusMonths(i);

      // Try to find existing budget, don't create new ones for comparison
      var budgetOpt = monthlyBudgetRepository.findByMonthAndUserId(targetMonth, userId);

      BudgetComparisonDTO dto = new BudgetComparisonDTO();
      dto.setMonth(targetMonth.format(formatter));

      if (budgetOpt.isPresent()) {
        MonthlyBudget budget = budgetOpt.get();
        dto.setIncome(budget.getTotalIncome());
        dto.setExpenses(budget.getTotalExpenses());
        dto.setSavings(budget.getRemaining());
        dto.setSavingsRate(budget.getSavingsRate());
        dto.setBudgetAdherence(budget.getBudgetAdherence());
      } else {
        dto.setIncome(0);
        dto.setExpenses(0);
        dto.setSavings(0);
        dto.setSavingsRate(0);
        dto.setBudgetAdherence(100);
      }

      comparisons.add(dto);
    }

    return comparisons;
  }

  public List<SavingsRateDTO> getSavingsRateHistory(int months) {
    List<SavingsRateDTO> history = new ArrayList<>();
    YearMonth current = YearMonth.now();
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");
    String userId = authUtils.getCurrentUserId();

    for (int i = months - 1; i >= 0; i--) {
      YearMonth targetMonth = current.minusMonths(i);
      var budgetOpt = monthlyBudgetRepository.findByMonthAndUserId(targetMonth, userId);

      if (budgetOpt.isPresent()) {
        MonthlyBudget budget = budgetOpt.get();
        double income = budget.getTotalIncome();
        double expenses = budget.getTotalExpenses();
        double savings = income - expenses;
        double savingsRate = income > 0 ? (savings / income) * 100 : 0;

        history.add(
            new SavingsRateDTO(
                targetMonth.format(formatter), savingsRate, income, expenses, savings));
      } else {
        history.add(new SavingsRateDTO(targetMonth.format(formatter), 0, 0, 0, 0));
      }
    }

    return history;
  }
}
