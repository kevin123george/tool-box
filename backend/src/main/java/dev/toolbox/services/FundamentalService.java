package dev.toolbox.services;

import dev.toolbox.models.CompanyOverview;
import dev.toolbox.models.EarningsData;
import dev.toolbox.models.FinancialStatement;
import dev.toolbox.models.dto.FundamentalDataDTO;
import dev.toolbox.repos.FinancialStatementRepository;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FundamentalService {

  @Autowired private AlphaVantageService alphaVantageService;
  @Autowired private FinancialStatementRepository statementRepo;

  public FundamentalDataDTO getFundamentals(String symbol) {
    FundamentalDataDTO dto = new FundamentalDataDTO();
    dto.setOverview(alphaVantageService.fetchCompanyOverview(symbol));
    dto.setIncomeStatements(alphaVantageService.fetchIncomeStatement(symbol));
    dto.setBalanceSheets(alphaVantageService.fetchBalanceSheet(symbol));
    dto.setCashFlows(alphaVantageService.fetchCashFlow(symbol));
    dto.setEarnings(alphaVantageService.fetchEarnings(symbol));
    dto.setRevenueHistory(getRevenueHistory(symbol));
    dto.setEpsHistory(getEPSHistory(symbol));
    dto.setFcfHistory(getFCFHistory(symbol));
    dto.setMargins(getMargins(symbol));
    dto.setRatios(getKeyRatios(symbol));
    return dto;
  }

  public List<Map<String, Object>> getRevenueHistory(String symbol) {
    List<FinancialStatement> statements =
        statementRepo.findBySymbolAndStatementTypeAndPeriod(
            symbol.toUpperCase(), "INCOME", "annual");

    return statements.stream()
        .sorted(Comparator.comparing(FinancialStatement::getFiscalDateEnding))
        .map(
            s -> {
              Map<String, Object> entry = new LinkedHashMap<>();
              entry.put("date", s.getFiscalDateEnding());
              entry.put("totalRevenue", parseNum(s.getData().get("totalRevenue")));
              entry.put("grossProfit", parseNum(s.getData().get("grossProfit")));
              entry.put("netIncome", parseNum(s.getData().get("netIncome")));
              return entry;
            })
        .collect(Collectors.toList());
  }

  public List<Map<String, Object>> getEPSHistory(String symbol) {
    List<EarningsData> earnings = alphaVantageService.fetchEarnings(symbol);

    return earnings.stream()
        .sorted(Comparator.comparing(EarningsData::getFiscalDateEnding))
        .limit(20)
        .map(
            e -> {
              Map<String, Object> entry = new LinkedHashMap<>();
              entry.put("date", e.getFiscalDateEnding());
              entry.put("reportedEPS", e.getReportedEPS());
              entry.put("estimatedEPS", e.getEstimatedEPS());
              entry.put("surprise", e.getSurprise());
              entry.put("surprisePercentage", e.getSurprisePercentage());
              boolean beat =
                  e.getReportedEPS() != null
                      && e.getEstimatedEPS() != null
                      && e.getReportedEPS() > e.getEstimatedEPS();
              entry.put("beat", beat);
              return entry;
            })
        .collect(Collectors.toList());
  }

  public List<Map<String, Object>> getFCFHistory(String symbol) {
    List<FinancialStatement> cashFlows =
        statementRepo.findBySymbolAndStatementTypeAndPeriod(
            symbol.toUpperCase(), "CASH_FLOW", "annual");

    return cashFlows.stream()
        .sorted(Comparator.comparing(FinancialStatement::getFiscalDateEnding))
        .map(
            s -> {
              Map<String, Object> entry = new LinkedHashMap<>();
              entry.put("date", s.getFiscalDateEnding());
              Double operatingCF = parseNum(s.getData().get("operatingCashflow"));
              Double capex = parseNum(s.getData().get("capitalExpenditures"));
              // Prefer direct FCF from yfinance, fall back to computed
              Double fcf = parseNum(s.getData().get("freeCashFlow"));
              if (fcf == null && operatingCF != null && capex != null) {
                fcf = operatingCF - Math.abs(capex);
              }
              entry.put("operatingCashflow", operatingCF);
              entry.put("capitalExpenditures", capex);
              entry.put("freeCashFlow", fcf);
              return entry;
            })
        .collect(Collectors.toList());
  }

  public Map<String, Object> getMargins(String symbol) {
    List<FinancialStatement> statements =
        statementRepo.findBySymbolAndStatementTypeAndPeriod(
            symbol.toUpperCase(), "INCOME", "annual");

    List<Map<String, Object>> marginHistory =
        statements.stream()
            .sorted(Comparator.comparing(FinancialStatement::getFiscalDateEnding))
            .map(
                s -> {
                  Map<String, Object> entry = new LinkedHashMap<>();
                  entry.put("date", s.getFiscalDateEnding());
                  Double revenue = parseNum(s.getData().get("totalRevenue"));
                  Double grossProfit = parseNum(s.getData().get("grossProfit"));
                  Double operatingIncome = parseNum(s.getData().get("operatingIncome"));
                  Double netIncome = parseNum(s.getData().get("netIncome"));

                  if (revenue != null && revenue != 0) {
                    if (grossProfit != null) entry.put("grossMargin", grossProfit / revenue);
                    if (operatingIncome != null)
                      entry.put("operatingMargin", operatingIncome / revenue);
                    if (netIncome != null) entry.put("netMargin", netIncome / revenue);
                  }
                  return entry;
                })
            .collect(Collectors.toList());

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("history", marginHistory);
    return result;
  }

  public Map<String, Object> getKeyRatios(String symbol) {
    CompanyOverview overview = alphaVantageService.fetchCompanyOverview(symbol);
    Map<String, Object> ratios = new LinkedHashMap<>();
    if (overview == null) return ratios;

    ratios.put("peRatio", overview.getPeRatio());
    ratios.put("pegRatio", overview.getPegRatio());
    ratios.put("pbRatio", overview.getPbRatio());
    ratios.put("psRatio", overview.getPsRatio());
    ratios.put("evToEbitda", overview.getEvToEbitda());
    ratios.put("roe", overview.getRoe());
    ratios.put("roa", overview.getRoa());
    ratios.put("profitMargin", overview.getProfitMargin());
    ratios.put("operatingMargin", overview.getOperatingMargin());
    ratios.put("debtToEquity", overview.getDebtToEquity());
    ratios.put("currentRatio", overview.getCurrentRatio());
    ratios.put("dividendYield", overview.getDividendYield());
    ratios.put("beta", overview.getBeta());
    return ratios;
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
