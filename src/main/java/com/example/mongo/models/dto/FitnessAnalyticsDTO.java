package com.example.mongo.models.dto;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class FitnessAnalyticsDTO {

  private Map<String, Integer> workoutsByType; // e.g., {"PUSH": 10, "PULL": 8}
  private List<WeeklyVolume> weeklyVolume; // workouts per week
  private double averageWorkoutsPerWeek;
  private int consistencyScore; // 0-100

  @Data
  public static class WeeklyVolume {
    private String weekLabel; // e.g., "2024-W01"
    private int workoutCount;
    private int totalMinutes;

    public WeeklyVolume() {}

    public WeeklyVolume(String weekLabel, int workoutCount, int totalMinutes) {
      this.weekLabel = weekLabel;
      this.workoutCount = workoutCount;
      this.totalMinutes = totalMinutes;
    }
  }
}
