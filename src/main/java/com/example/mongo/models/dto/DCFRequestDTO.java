package com.example.mongo.models.dto;

import lombok.Data;

@Data
public class DCFRequestDTO {
  private Double initialFCF;
  private Double growthRate;
  private Double discountRate;
  private Double terminalGrowthRate;
  private Integer projectionYears;
  private Long sharesOutstanding;
  private Double currentPrice;
  private String symbol;
}
