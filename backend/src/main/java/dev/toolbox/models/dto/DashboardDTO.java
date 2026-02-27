package dev.toolbox.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {
  private double totalCash;
  private double portfolioValue;
  private double portfolioInvested;
  private double portfolioReturn;
  private double netWorth;

  // Budget
  private double budgetIncome;
  private double budgetExpenses;
  private double budgetSavings;
  private double budgetAdherence;

  // Goal
  private double goalCurrent;
  private double goalTarget;
  private double goalProgress;
  private Integer goalFireAge;

  // Fitness
  private int fitnessCurrentStreak;
  private int fitnessThisWeek;
  private Double currentWeight;
  private Double weightChange;

  // Subscriptions
  private double subscriptionMonthly;
  private int subscriptionCount;

  // Savings Goals
  private double savingsGoalsSaved;
  private double savingsGoalsTarget;
  private int savingsGoalsCount;
}
