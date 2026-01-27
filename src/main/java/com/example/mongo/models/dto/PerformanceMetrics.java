package com.example.mongo.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceMetrics {
  private String symbol;

  // Returns
  private double totalReturn;        // Total return percentage
  private double cagr;               // Compound Annual Growth Rate
  private double dailyReturn;        // Average daily return

  // Risk metrics
  private double volatility;         // Standard deviation of returns (annualized)
  private double maxDrawdown;        // Maximum peak-to-trough decline
  private double maxDrawdownPercent; // Max drawdown as percentage

  // Risk-adjusted returns
  private double sharpeRatio;        // (Return - Risk-free rate) / Volatility
  private double sortinoRatio;       // Like Sharpe but only considers downside volatility

  // Benchmark comparison
  private double beta;               // Volatility relative to benchmark
  private double alpha;              // Excess return over benchmark
  private double correlation;        // Correlation with benchmark

  // Price data
  private double highestPrice;
  private double lowestPrice;
  private double currentPrice;
  private double avgPrice;

  // Time info
  private int dataPoints;
  private int tradingDays;
}
