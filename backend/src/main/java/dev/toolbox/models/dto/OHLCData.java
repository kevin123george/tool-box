package dev.toolbox.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OHLCData {
  private long time; // Unix epoch seconds
  private double open;
  private double high;
  private double low;
  private double close;
  private double volume; // Number of data points in this candle (or actual volume if available)
}
