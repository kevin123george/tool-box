package com.example.mongo.models;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseRecord {

  private ExpenseCategory category;
  private double amount;
  private String description;
  private Instant recordDate;

  public ExpenseRecord(ExpenseCategory category, double amount, String description) {
    this.category = category;
    this.amount = amount;
    this.description = description;
    this.recordDate = Instant.now();
  }
}
