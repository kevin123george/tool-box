package dev.toolbox.models.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyAnalyticsDTO {
  private String month;
  private double totalExpenses;
  private double totalIncome;
  private Map<String, Double> expensesByCategory;
  private double savingsRate;
}
