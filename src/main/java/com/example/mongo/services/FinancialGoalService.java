package com.example.mongo.services;

import com.example.mongo.models.BankAccount;
import com.example.mongo.models.FinancialGoal;
import com.example.mongo.repos.BankAccountRepository;
import com.example.mongo.repos.FinancialGoalRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FinancialGoalService {

    private final FinancialGoalRepository repo;
    private final BankAccountRepository bankRepo;

    public FinancialGoalService(FinancialGoalRepository repo,
                                BankAccountRepository bankRepo) {
        this.repo = repo;
        this.bankRepo = bankRepo;
    }

    /** Pull total corpus from bank accounts */
    private double getTotalCorpus() {
        return bankRepo.findAll()
                .stream()
                .mapToDouble(BankAccount::getBalance)
                .sum();
    }

    /** Compute required retirement corpus */
    private double calculateRequiredCorpus(FinancialGoal g) {
        double grossNeeded = g.getTargetYearlyIncome() / (1 - g.getTaxRate());
        return grossNeeded / g.getExpectedReturnRate();
    }

    /** Saves or updates a plan */
    public FinancialGoal saveGoal(FinancialGoal goal) {

        double corpus = getTotalCorpus();
        goal.setCurrentCorpus(corpus);

        double requiredCorpus = calculateRequiredCorpus(goal);
        goal.setRequiredCorpus(requiredCorpus);

        boolean achieved = corpus >= requiredCorpus;
        goal.setGoalAchieved(achieved);

        // Calculate years to goal
        int years = 0;
        double workingCorpus = corpus;

        while (workingCorpus < requiredCorpus && years < 50) {
            workingCorpus = workingCorpus * (1 + goal.getExpectedReturnRate())
                    + goal.getYearlyContribution();
            years++;
        }

        if (workingCorpus >= requiredCorpus) {
            goal.setYearsToGoal(years);
            goal.setGoalAchievedAge(goal.getCurrentAge() + years);
        } else {
            goal.setYearsToGoal(null); // unreachable
            goal.setGoalAchievedAge(null);
        }

        goal.setFinalProjectedCorpus(workingCorpus);

        return repo.save(goal);
    }

    /** Year-by-year projection */
    public String getProjection(FinancialGoal goal) {

        double corpus = goal.getCurrentCorpus();
        double yearlyAdd = goal.getYearlyContribution();
        double rate = goal.getExpectedReturnRate();

        StringBuilder sb = new StringBuilder();
        int age = goal.getCurrentAge();

        for (int i = 1; i <= 30; i++) {
            corpus = corpus * (1 + rate) + yearlyAdd;
            sb.append("Age ").append(age + i).append(": €").append(String.format("%.2f", corpus)).append("\n");

            if (corpus >= goal.getRequiredCorpus()
                    && !goal.isGoalAchieved()) {
                sb.append("→ Goal achieved at age ").append(age + i).append("\n");
                break;
            }
        }
        return sb.toString();
    }

    public FinancialGoal getGoal(String id) {
        return repo.findById(id).orElse(null);
    }


    public List<FinancialGoal> getAll() {
        return repo.findAll();
    }


    public void deleteAll() {
        repo.deleteAll();
    }

}
