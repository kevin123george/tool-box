package com.example.mongo.models.dto;

import com.example.mongo.models.CompanyOverview;
import com.example.mongo.models.EarningsData;
import com.example.mongo.models.FinancialStatement;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class FundamentalDataDTO {
  private CompanyOverview overview;
  private List<FinancialStatement> incomeStatements;
  private List<FinancialStatement> balanceSheets;
  private List<FinancialStatement> cashFlows;
  private List<EarningsData> earnings;
  private List<Map<String, Object>> revenueHistory;
  private List<Map<String, Object>> epsHistory;
  private List<Map<String, Object>> fcfHistory;
  private Map<String, Object> margins;
  private Map<String, Object> ratios;
}
