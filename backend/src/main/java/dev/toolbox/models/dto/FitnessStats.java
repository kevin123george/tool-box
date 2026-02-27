package dev.toolbox.models.dto;

import lombok.Data;

@Data
public class FitnessStats {

  private int currentStreak; // consecutive workout days
  private int longestStreak;
  private int totalWorkouts;
  private int thisWeekWorkouts;
  private Double averageWeight; // kg
  private Double weightChange; // kg change from first to last entry in period

  public FitnessStats() {}

  public FitnessStats(
      int currentStreak,
      int longestStreak,
      int totalWorkouts,
      int thisWeekWorkouts,
      Double averageWeight,
      Double weightChange) {
    this.currentStreak = currentStreak;
    this.longestStreak = longestStreak;
    this.totalWorkouts = totalWorkouts;
    this.thisWeekWorkouts = thisWeekWorkouts;
    this.averageWeight = averageWeight;
    this.weightChange = weightChange;
  }
}
