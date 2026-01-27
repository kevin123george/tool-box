package com.example.mongo.controller;

import com.example.mongo.models.FinancialGoal;
import com.example.mongo.models.MonthlyBudget;
import com.example.mongo.models.dto.DashboardDTO;
import com.example.mongo.models.dto.FinanceSummaryDTO;
import com.example.mongo.models.dto.PortfolioStats;
import com.example.mongo.repos.FinancialGoalRepository;
import com.example.mongo.services.BankAccountService;
import com.example.mongo.services.MonthlyBudgetService;
import com.example.mongo.services.StockService;
import java.time.YearMonth;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

  private final BankAccountService bankAccountService;
  private final StockService stockService;
  private final MonthlyBudgetService budgetService;
  private final FinancialGoalRepository goalRepository;

  public DashboardController(
      BankAccountService bankAccountService,
      StockService stockService,
      MonthlyBudgetService budgetService,
      FinancialGoalRepository goalRepository) {
    this.bankAccountService = bankAccountService;
    this.stockService = stockService;
    this.budgetService = budgetService;
    this.goalRepository = goalRepository;
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
        portfolioInvested > 0 ? ((portfolioValue - portfolioInvested) / portfolioInvested * 100) : 0;

    // Get current month budget
    YearMonth currentMonth = YearMonth.now();
    MonthlyBudget budget = budgetService.getOrCreateBudget(currentMonth);
    double budgetIncome = budget.getTotalIncome();
    double budgetExpenses = budget.getTotalExpenses();
    double budgetSavings = budgetIncome - budgetExpenses;
    double budgetAdherence = budget.getBudgetAdherence();

    // Get first goal if exists
    List<FinancialGoal> goals = goalRepository.findAll();
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
            .build();

    return ResponseEntity.ok(dashboard);
  }
}
