package dev.toolbox.models;

public enum AlertCondition {
  PRICE_ABOVE, // price >= targetPrice
  PRICE_BELOW, // price <= targetPrice
  DAILY_CHANGE_UP, // day % gain >= targetPercent  (portfolio only)
  DAILY_CHANGE_DOWN, // day % loss >= targetPercent (portfolio only)
  PNL_UP, // P&L % from buy >= targetPercent       (portfolio only)
  PNL_DOWN, // P&L % loss from buy >= targetPercent (portfolio only)
  WEEK_52_HIGH, // price hits new 52-week high       (portfolio only)
  WEEK_52_LOW, // price hits new 52-week low         (portfolio only)
}
