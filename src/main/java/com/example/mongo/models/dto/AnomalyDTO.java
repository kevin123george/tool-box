package com.example.mongo.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnomalyDTO {
  private String category;
  private String month;
  private double currentAmount;
  private double averageAmount;
  private double percentageIncrease;
}
