package com.example.mongo.models.dto;

import java.util.List;
import lombok.Data;

@Data
public class StockTickerResponse {
  private List<Result> results;
  private String status;

  @Data
  public static class Result {
    private String ticker;
    private String name;
    private String market;
    private String currency_name;

    // Getters & setters
  }

  // Getters & setters
}
