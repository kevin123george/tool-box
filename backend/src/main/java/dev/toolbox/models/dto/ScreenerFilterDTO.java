package dev.toolbox.models.dto;

import lombok.Data;

@Data
public class ScreenerFilterDTO {
  private Double minPE;
  private Double maxPE;
  private Double minMarketCap;
  private Double maxMarketCap;
  private Double minDividendYield;
  private String sector;
  private Double minROE;
  private Double maxDebtToEquity;
  private String sortBy = "marketCap";
  private String sortDir = "desc";
  private Integer page = 0;
  private Integer size = 20;
}
