package com.example.mongo.models;

import java.time.Instant;
import java.time.LocalDate;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "savings_goals")
public class SavingsGoal {

  @Id private String id;

  private String name;
  private double targetAmount;
  private double currentAmount;
  private LocalDate deadline;
  private String icon;
  private String color;
  private String notes;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant lastModified;

  public SavingsGoal(String name, double targetAmount) {
    this.name = name;
    this.targetAmount = targetAmount;
    this.currentAmount = 0;
  }

  public double getProgressPercentage() {
    return targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  }

  public long getDaysRemaining() {
    if (deadline == null) return -1;
    return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), deadline);
  }

  public boolean isCompleted() {
    return currentAmount >= targetAmount;
  }
}
