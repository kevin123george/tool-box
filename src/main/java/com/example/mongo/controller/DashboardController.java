package com.example.mongo.controller;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.FinancialGoal;
import com.example.mongo.models.MonthlyBudget;
import com.example.mongo.models.dto.DashboardDTO;
import com.example.mongo.models.dto.FinanceSummaryDTO;
import com.example.mongo.models.dto.FitnessStats;
import com.example.mongo.models.dto.PortfolioStats;
import com.example.mongo.models.dto.SubscriptionSummaryDTO;
import com.example.mongo.repos.FinancialGoalRepository;
import com.example.mongo.services.BankAccountService;
import com.example.mongo.services.FitnessService;
import com.example.mongo.services.MonthlyBudgetService;
import com.example.mongo.services.SavingsGoalService;
import com.example.mongo.services.StockService;
import com.example.mongo.services.SubscriptionService;
import java.time.YearMonth;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

  private final BankAccountService bankAccountService;
  private final StockService stockService;
  private final MonthlyBudgetService budgetService;
  private final FinancialGoalRepository goalRepository;
  private final FitnessService fitnessService;
  private final AuthUtils authUtils;
  private final SubscriptionService subscriptionService;
  private final SavingsGoalService savingsGoalService;

  public DashboardController(
      BankAccountService bankAccountService,
      StockService stockService,
      MonthlyBudgetService budgetService,
      FinancialGoalRepository goalRepository,
      FitnessService fitnessService,
      AuthUtils authUtils,
      SubscriptionService subscriptionService,
      SavingsGoalService savingsGoalService) {
    this.bankAccountService = bankAccountService;
    this.stockService = stockService;
    this.budgetService = budgetService;
    this.goalRepository = goalRepository;
    this.fitnessService = fitnessService;
    this.authUtils = authUtils;
    this.subscriptionService = subscriptionService;
    this.savingsGoalService = savingsGoalService;
  }

  @GetMapping
  public ResponseEntity<DashboardDTO> getDashboard() {
    // Get total cash from bank accounts
    FinanceSummaryDTO financeSummary = bankAccountService.getSummary();
    double totalCash = financeSummary.getTotalBalance();

    // Get portfolio stats
    PortfolioStats portfolioStats = stockService.getPortfolioStats();
    double portfolioValue = portfolioStats.currentValue;
    double portfolioInvested = portfolioStats.totalInvested;
    double portfolioReturn =
        portfolioInvested > 0
            ? ((portfolioValue - portfolioInvested) / portfolioInvested * 100)
            : 0;

    // Get current month budget
    YearMonth currentMonth = YearMonth.now();
    MonthlyBudget budget = budgetService.getOrCreateBudget(currentMonth);
    double budgetIncome = budget.getTotalIncome();
    double budgetExpenses = budget.getTotalExpenses();
    double budgetSavings = budgetIncome - budgetExpenses;
    double budgetAdherence = budget.getBudgetAdherence();

    // Get first goal if exists (scoped to current user)
    List<FinancialGoal> goals = goalRepository.findAllByUserId(authUtils.getCurrentUserId());
    double goalCurrent = 0;
    double goalTarget = 0;
    double goalProgress = 0;
    Integer goalFireAge = null;

    if (!goals.isEmpty()) {
      FinancialGoal goal = goals.get(0);
      goalCurrent = goal.getCurrentCorpus();
      goalTarget = goal.getRequiredCorpus();
      goalProgress = goalTarget > 0 ? (goalCurrent / goalTarget * 100) : 0;
      goalFireAge = goal.getGoalAchievedAge();
    }

    // Calculate net worth
    double netWorth = totalCash + portfolioValue;

    // Get subscriptions
    SubscriptionSummaryDTO subSummary = subscriptionService.getSummary();

    // Get savings goals
    double savingsGoalsSaved  = savingsGoalService.getTotalSaved();
    double savingsGoalsTarget = savingsGoalService.getTotalTarget();
    int savingsGoalsCount     = savingsGoalService.getAllGoals().size();

    // Get fitness stats
    FitnessStats fitnessStats = fitnessService.calculateStats();
    Double currentWeight = fitnessService.getLatestWeight().map(w -> w.getWeight()).orElse(null);

    DashboardDTO dashboard =
        DashboardDTO.builder()
            .totalCash(totalCash)
            .portfolioValue(portfolioValue)
            .portfolioInvested(portfolioInvested)
            .portfolioReturn(portfolioReturn)
            .netWorth(netWorth)
            .budgetIncome(budgetIncome)
            .budgetExpenses(budgetExpenses)
            .budgetSavings(budgetSavings)
            .budgetAdherence(budgetAdherence)
            .goalCurrent(goalCurrent)
            .goalTarget(goalTarget)
            .goalProgress(goalProgress)
            .goalFireAge(goalFireAge)
            .fitnessCurrentStreak(fitnessStats.getCurrentStreak())
            .fitnessThisWeek(fitnessStats.getThisWeekWorkouts())
            .currentWeight(currentWeight)
            .weightChange(fitnessStats.getWeightChange())
            .subscriptionMonthly(subSummary.getTotalMonthly())
            .subscriptionCount(subSummary.getActiveCount())
            .savingsGoalsSaved(savingsGoalsSaved)
            .savingsGoalsTarget(savingsGoalsTarget)
            .savingsGoalsCount(savingsGoalsCount)
            .build();

    return ResponseEntity.ok(dashboard);
  }
}
