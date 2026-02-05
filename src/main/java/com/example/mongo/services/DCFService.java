package com.example.mongo.services;

import com.example.mongo.models.CompanyOverview;
import com.example.mongo.models.FinancialStatement;
import com.example.mongo.models.dto.DCFRequestDTO;
import com.example.mongo.models.dto.DCFResultDTO;
import com.example.mongo.repos.FinancialStatementRepository;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class DCFService {

  @Autowired private AlphaVantageService alphaVantageService;
  @Autowired private FinancialStatementRepository statementRepo;

  public Map<String, Object> getDefaults(String symbol) {
    CompanyOverview overview = alphaVantageService.fetchCompanyOverview(symbol);
    List<FinancialStatement> cashFlows =
        statementRepo.findBySymbolAndStatementTypeAndPeriod(
            symbol.toUpperCase(), "CASH_FLOW", "annual");

    // If cash flows are empty, try fetching them
    if (cashFlows.isEmpty()) {
      alphaVantageService.fetchCashFlow(symbol);
      cashFlows =
          statementRepo.findBySymbolAndStatementTypeAndPeriod(
              symbol.toUpperCase(), "CASH_FLOW", "annual");
    }

    Map<String, Object> defaults = new LinkedHashMap<>();
    defaults.put("symbol", symbol.toUpperCase());

    // Calculate latest FCF
    Double latestFCF = null;
    if (!cashFlows.isEmpty()) {
      FinancialStatement latest =
          cashFlows.stream()
              .max(Comparator.comparing(FinancialStatement::getFiscalDateEnding))
              .orElse(null);
      if (latest != null) {
        Double operatingCF = parseNum(latest.getData().get("operatingCashflow"));
        Double capex = parseNum(latest.getData().get("capitalExpenditures"));
        if (operatingCF != null && capex != null) {
          latestFCF = operatingCF - Math.abs(capex);
        }
      }
    }

    defaults.put("initialFCF", latestFCF);
    defaults.put("growthRate", 0.10); // 10% default
    defaults.put("discountRate", 0.10); // 10% WACC default
    defaults.put("terminalGrowthRate", 0.03); // 3% perpetuity growth
    defaults.put("projectionYears", 10);
    defaults.put(
        "sharesOutstanding", overview != null ? overview.getSharesOutstanding() : null);
    defaults.put("currentPrice", overview != null ? overview.getWeekHigh52() : null);
    defaults.put("name", overview != null ? overview.getName() : null);

    return defaults;
  }

  public DCFResultDTO calculateDCF(DCFRequestDTO request) {
    if (request.getInitialFCF() == null
        || request.getGrowthRate() == null
        || request.getDiscountRate() == null
        || request.getTerminalGrowthRate() == null
        || request.getProjectionYears() == null
        || request.getSharesOutstanding() == null) {
      throw new IllegalArgumentException("All DCF inputs are required");
    }

    double fcf = request.getInitialFCF();
    double growthRate = request.getGrowthRate();
    double discountRate = request.getDiscountRate();
    double terminalGrowthRate = request.getTerminalGrowthRate();
    int years = request.getProjectionYears();
    long shares = request.getSharesOutstanding();

    List<Map<String, Object>> projectedCashFlows = new ArrayList<>();
    double totalPV = 0;

    // Project cash flows and discount them
    for (int year = 1; year <= years; year++) {
      fcf = fcf * (1 + growthRate);
      double discountFactor = Math.pow(1 + discountRate, year);
      double presentValue = fcf / discountFactor;
      totalPV += presentValue;

      Map<String, Object> cf = new LinkedHashMap<>();
      cf.put("year", year);
      cf.put("projectedFCF", Math.round(fcf));
      cf.put("discountFactor", Math.round(discountFactor * 1000.0) / 1000.0);
      cf.put("presentValue", Math.round(presentValue));
      projectedCashFlows.add(cf);
    }

    // Terminal value using Gordon Growth Model
    double terminalFCF = fcf * (1 + terminalGrowthRate);
    double terminalValue = terminalFCF / (discountRate - terminalGrowthRate);
    double terminalPV = terminalValue / Math.pow(1 + discountRate, years);

    // Enterprise value
    double enterpriseValue = totalPV + terminalPV;

    // Intrinsic value per share
    double intrinsicValue = enterpriseValue / shares;

    // Margin of safety
    Double currentPrice = request.getCurrentPrice();
    Double marginOfSafety = null;
    String verdict = "UNKNOWN";
    if (currentPrice != null && currentPrice > 0) {
      marginOfSafety = ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
      if (marginOfSafety > 25) {
        verdict = "UNDERVALUED";
      } else if (marginOfSafety < -10) {
        verdict = "OVERVALUED";
      } else {
        verdict = "FAIRLY_VALUED";
      }
    }

    DCFResultDTO result = new DCFResultDTO();
    result.setSymbol(request.getSymbol());
    result.setIntrinsicValue(Math.round(intrinsicValue * 100.0) / 100.0);
    result.setCurrentPrice(currentPrice);
    result.setMarginOfSafety(marginOfSafety != null ? Math.round(marginOfSafety * 100.0) / 100.0 : null);
    result.setVerdict(verdict);
    result.setTotalPresentValue((double) Math.round(totalPV));
    result.setTerminalValue((double) Math.round(terminalValue));
    result.setTerminalPresentValue((double) Math.round(terminalPV));
    result.setEnterpriseValue((double) Math.round(enterpriseValue));
    result.setSharesOutstanding(shares);
    result.setProjectedCashFlows(projectedCashFlows);

    // Store inputs for reference
    Map<String, Object> inputs = new LinkedHashMap<>();
    inputs.put("initialFCF", request.getInitialFCF());
    inputs.put("growthRate", growthRate);
    inputs.put("discountRate", discountRate);
    inputs.put("terminalGrowthRate", terminalGrowthRate);
    inputs.put("projectionYears", years);
    inputs.put("sharesOutstanding", shares);
    result.setInputs(inputs);

    return result;
  }

  private Double parseNum(Object val) {
    if (val == null || "None".equals(val) || "-".equals(val)) return null;
    try {
      return Double.parseDouble(val.toString());
    } catch (NumberFormatException e) {
      return null;
    }
  }
}
