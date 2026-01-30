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
  private String type; // INCOME, EXPENSE, SUBSCRIPTION, DIVIDEND
  private String source; // The originating service/entity
}
