package com.example.mongo.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavingsRateDTO {
  private String month;
  private double savingsRate;
  private double income;
  private double expenses;
  private double savings;
}
