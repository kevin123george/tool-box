package com.example.mongo.models.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OHLCData {
  private LocalDateTime time;
  private double open;
  private double high;
  private double low;
  private double close;
  private double volume; // Number of data points in this candle (or actual volume if available)
}
