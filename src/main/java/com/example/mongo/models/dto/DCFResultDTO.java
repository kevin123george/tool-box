package com.example.mongo.models.dto;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class DCFResultDTO {
  private String symbol;
  private Double intrinsicValue;
  private Double currentPrice;
  private Double marginOfSafety;
  private String verdict; // UNDERVALUED, FAIRLY_VALUED, OVERVALUED
  private Double totalPresentValue;
  private Double terminalValue;
  private Double terminalPresentValue;
  private Double enterpriseValue;
  private Long sharesOutstanding;
  private List<Map<String, Object>> projectedCashFlows;
  private Map<String, Object> inputs;
}
