package com.example.mongo.models.dto;

public class PortfolioStats {
  public double totalInvested;
  public double currentValue;
  public double totalProfit;

  public PortfolioStats(double totalInvested, double currentValue, double totalProfit) {
    this.totalInvested = totalInvested;
    this.currentValue = currentValue;
    this.totalProfit = totalProfit;
  }
}
