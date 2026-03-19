package dev.toolbox.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TRTradeDTO {
  private String date; // ISO YYYY-MM-DD
  private String action; // BUY or SELL
  private String isin;
  private String name;
  private double quantity;
  private double totalEur;
  private double pricePerShare;
  private String symbol; // user-editable ticker for yfinance
  private boolean selected;
}
