package com.example.mongo.models.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryTrendDTO {
  private String category;
  private Map<String, Double> monthlyAmounts; // month (YYYY-MM) -> amount
}
