package com.example.mongo.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEventDTO {
  private int day;
  private String title;
  private double amount;
  private String type; // INCOME, EXPENSE, SUBSCRIPTION, DIVIDEND, WORKOUT
  private String source; // The originating service/entity
  private String subType; // For workouts: PUSH, PULL, LEGS, etc.
  private Boolean completed; // For workouts: completion status

  // Constructor for backwards compatibility
  public CalendarEventDTO(int day, String title, double amount, String type, String source) {
    this.day = day;
    this.title = title;
    this.amount = amount;
    this.type = type;
    this.source = source;
  }
}
