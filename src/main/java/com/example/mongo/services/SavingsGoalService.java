package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.SavingsGoal;
import com.example.mongo.repos.SavingsGoalRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SavingsGoalService {

  @Autowired private SavingsGoalRepository savingsGoalRepository;
  @Autowired private AuthUtils authUtils;

  public List<SavingsGoal> getAllGoals() {
    return savingsGoalRepository.findAllByUserIdOrderByDeadlineAsc(authUtils.getCurrentUserId());
  }

  public SavingsGoal getGoalById(String id) {
    return savingsGoalRepository
        .findById(id)
        .orElseThrow(() -> new RuntimeException("Savings goal not found: " + id));
  }

  public SavingsGoal createGoal(SavingsGoal goal) {
    goal.setUserId(authUtils.getCurrentUserId());
    return savingsGoalRepository.save(goal);
  }

  public SavingsGoal updateGoal(String id, SavingsGoal updated) {
    SavingsGoal existing = getGoalById(id);
    existing.setName(updated.getName());
    existing.setTargetAmount(updated.getTargetAmount());
    existing.setCurrentAmount(updated.getCurrentAmount());
    existing.setDeadline(updated.getDeadline());
    existing.setIcon(updated.getIcon());
    existing.setColor(updated.getColor());
    existing.setNotes(updated.getNotes());
    return savingsGoalRepository.save(existing);
  }

  public SavingsGoal contribute(String id, double amount) {
    SavingsGoal goal = getGoalById(id);
    goal.setCurrentAmount(goal.getCurrentAmount() + amount);
    return savingsGoalRepository.save(goal);
  }

  public void deleteGoal(String id) {
    savingsGoalRepository.deleteById(id);
  }

  public double getTotalSaved() {
    return savingsGoalRepository.findAllByUserId(authUtils.getCurrentUserId()).stream()
        .mapToDouble(SavingsGoal::getCurrentAmount)
        .sum();
  }

  public double getTotalTarget() {
    return savingsGoalRepository.findAllByUserId(authUtils.getCurrentUserId()).stream()
        .mapToDouble(SavingsGoal::getTargetAmount)
        .sum();
  }
}
