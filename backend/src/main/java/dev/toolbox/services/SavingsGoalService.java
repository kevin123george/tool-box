package dev.toolbox.services;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.SavingsGoal;
import dev.toolbox.repos.SavingsGoalRepository;
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
    String userId = authUtils.getCurrentUserId();
    SavingsGoal goal =
        savingsGoalRepository
            .findById(id)
            .orElseThrow(() -> new RuntimeException("Savings goal not found: " + id));
    if (!userId.equals(goal.getUserId())) throw new RuntimeException("Access denied");
    return goal;
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
    String userId = authUtils.getCurrentUserId();
    savingsGoalRepository
        .findById(id)
        .ifPresent(
            goal -> {
              if (userId.equals(goal.getUserId())) savingsGoalRepository.deleteById(id);
            });
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
