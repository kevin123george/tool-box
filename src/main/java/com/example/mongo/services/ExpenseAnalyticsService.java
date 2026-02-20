package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.ExpenseCategory;
import com.example.mongo.models.MonthlyBudget;
import com.example.mongo.models.dto.AnomalyDTO;
import com.example.mongo.models.dto.CategoryTrendDTO;
import com.example.mongo.models.dto.MonthlyAnalyticsDTO;
import com.example.mongo.repos.MonthlyBudgetRepository;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ExpenseAnalyticsService {

  @Autowired private MonthlyBudgetRepository budgetRepository;
  @Autowired private AuthUtils authUtils;

  private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
  private static final double ANOMALY_THRESHOLD = 40.0; // 40% increase

  public List<CategoryTrendDTO> getCategoryTrends(int months) {
    List<MonthlyBudget> budgets = getRecentBudgets(months, authUtils.getCurrentUserId());
    Map<String, Map<String, Double>> categoryMonthlyData = new HashMap<>();

    for (MonthlyBudget budget : budgets) {
      String monthKey = budget.getMonth().format(MONTH_FORMATTER);
      Map<ExpenseCategory, Double> expenses = budget.getExpensesByCategory();

      for (Map.Entry<ExpenseCategory, Double> entry : expenses.entrySet()) {
        String category = entry.getKey().name();
        categoryMonthlyData.computeIfAbsent(category, k -> new LinkedHashMap<>());
        categoryMonthlyData.get(category).put(monthKey, entry.getValue());
      }
    }

    return categoryMonthlyData.entrySet().stream()
        .map(e -> new CategoryTrendDTO(e.getKey(), e.getValue()))
        .toList();
  }

  public List<MonthlyAnalyticsDTO> getMonthlyAnalytics(int months) {
    List<MonthlyBudget> budgets = getRecentBudgets(months, authUtils.getCurrentUserId());
    List<MonthlyAnalyticsDTO> analytics = new ArrayList<>();

    for (MonthlyBudget budget : budgets) {
      Map<String, Double> expensesByCategory = new HashMap<>();
      for (Map.Entry<ExpenseCategory, Double> entry : budget.getExpensesByCategory().entrySet()) {
        expensesByCategory.put(entry.getKey().name(), entry.getValue());
      }

      analytics.add(
          new MonthlyAnalyticsDTO(
              budget.getMonth().format(MONTH_FORMATTER),
              budget.getTotalExpenses(),
              budget.getTotalIncome(),
              expensesByCategory,
              budget.getSavingsRate()));
    }

    return analytics;
  }

  public List<AnomalyDTO> getAnomalies() {
    List<AnomalyDTO> anomalies = new ArrayList<>();
    List<MonthlyBudget> budgets = getRecentBudgets(4, authUtils.getCurrentUserId()); // Current + 3 months for average

    if (budgets.size() < 2) return anomalies;

    // Current month is the most recent
    MonthlyBudget current = budgets.get(budgets.size() - 1);
    String currentMonth = current.getMonth().format(MONTH_FORMATTER);
    Map<ExpenseCategory, Double> currentExpenses = current.getExpensesByCategory();

    // Calculate 3-month average for each category (excluding current month)
    Map<ExpenseCategory, Double> averages = new HashMap<>();
    Map<ExpenseCategory, Integer> counts = new HashMap<>();

    for (int i = 0; i < budgets.size() - 1 && i < 3; i++) {
      MonthlyBudget budget = budgets.get(i);
      for (Map.Entry<ExpenseCategory, Double> entry : budget.getExpensesByCategory().entrySet()) {
        averages.merge(entry.getKey(), entry.getValue(), Double::sum);
        counts.merge(entry.getKey(), 1, Integer::sum);
      }
    }

    // Calculate actual averages
    for (ExpenseCategory category : averages.keySet()) {
      averages.put(category, averages.get(category) / counts.get(category));
    }

    // Find anomalies
    for (Map.Entry<ExpenseCategory, Double> entry : currentExpenses.entrySet()) {
      ExpenseCategory category = entry.getKey();
      double currentAmount = entry.getValue();
      Double avgAmount = averages.get(category);

      if (avgAmount != null && avgAmount > 0) {
        double percentageIncrease = ((currentAmount - avgAmount) / avgAmount) * 100;

        if (percentageIncrease >= ANOMALY_THRESHOLD) {
          anomalies.add(
              new AnomalyDTO(
                  category.name(), currentMonth, currentAmount, avgAmount, percentageIncrease));
        }
      }
    }

    // Sort by percentage increase descending
    anomalies.sort((a, b) -> Double.compare(b.getPercentageIncrease(), a.getPercentageIncrease()));

    return anomalies;
  }

  private List<MonthlyBudget> getRecentBudgets(int months, String userId) {
    YearMonth current = YearMonth.now();
    List<MonthlyBudget> budgets = new ArrayList<>();

    for (int i = months - 1; i >= 0; i--) {
      YearMonth targetMonth = current.minusMonths(i);
      budgetRepository.findByMonthAndUserId(targetMonth, userId).ifPresent(budgets::add);
    }

    return budgets;
  }
}
