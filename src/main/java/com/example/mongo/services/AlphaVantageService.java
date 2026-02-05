package com.example.mongo.services;

import com.example.mongo.models.CompanyOverview;
import com.example.mongo.models.EarningsData;
import com.example.mongo.models.FinancialStatement;
import com.example.mongo.repos.CompanyOverviewRepository;
import com.example.mongo.repos.EarningsDataRepository;
import com.example.mongo.repos.FinancialStatementRepository;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class AlphaVantageService {

  @Value("${alpha.vantage.api.key:}")
  private String alphaVantageKey;

  @Autowired private CompanyOverviewRepository overviewRepo;
  @Autowired private FinancialStatementRepository statementRepo;
  @Autowired private EarningsDataRepository earningsRepo;

  private final RestTemplate restTemplate = new RestTemplate();
  private final Semaphore rateLimiter = new Semaphore(5);

  private static final String BASE_URL = "https://www.alphavantage.co/query";

  private void acquireRateLimit() {
    try {
      rateLimiter.acquire();
      // Schedule release after 12 seconds (5 calls/min = 1 per 12s)
      new Thread(
              () -> {
                try {
                  TimeUnit.SECONDS.sleep(12);
                } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
                } finally {
                  rateLimiter.release();
                }
              })
          .start();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> callApi(String function, String symbol) {
    if (alphaVantageKey == null || alphaVantageKey.isEmpty()) {
      log.warn("[AlphaVantage] API key not configured");
      return Collections.emptyMap();
    }

    acquireRateLimit();

    String url =
        String.format("%s?function=%s&symbol=%s&apikey=%s", BASE_URL, function, symbol, alphaVantageKey);
    log.info("[AlphaVantage] Fetching {} for {}", function, symbol);

    try {
      Map<String, Object> response = restTemplate.getForObject(url, Map.class);
      if (response != null && response.containsKey("Information")) {
        log.warn("[AlphaVantage] Rate limit message: {}", response.get("Information"));
        return Collections.emptyMap();
      }
      return response != null ? response : Collections.emptyMap();
    } catch (Exception e) {
      log.error("[AlphaVantage] Error fetching {} for {}: {}", function, symbol, e.getMessage());
      return Collections.emptyMap();
    }
  }

  public CompanyOverview fetchCompanyOverview(String symbol) {
    String upper = symbol.toUpperCase();

    // Check cache first
    Optional<CompanyOverview> cached = overviewRepo.findBySymbol(upper);
    if (cached.isPresent() && cached.get().getExpiresAt() != null
        && cached.get().getExpiresAt().isAfter(LocalDateTime.now())) {
      log.info("[AlphaVantage] Returning cached overview for {}", upper);
      return cached.get();
    }

    Map<String, Object> data = callApi("OVERVIEW", upper);
    if (data.isEmpty() || !data.containsKey("Symbol")) {
      return cached.orElse(null);
    }

    CompanyOverview overview = cached.orElse(new CompanyOverview());
    overview.setSymbol(upper);
    overview.setName(str(data.get("Name")));
    overview.setSector(str(data.get("Sector")));
    overview.setIndustry(str(data.get("Industry")));
    overview.setExchange(str(data.get("Exchange")));
    overview.setMarketCap(dbl(data.get("MarketCapitalization")));
    overview.setPeRatio(dbl(data.get("PERatio")));
    overview.setPegRatio(dbl(data.get("PEGRatio")));
    overview.setPbRatio(dbl(data.get("PriceToBookRatio")));
    overview.setPsRatio(dbl(data.get("PriceToSalesRatioTTM")));
    overview.setEvToEbitda(dbl(data.get("EVToEBITDA")));
    overview.setEps(dbl(data.get("EPS")));
    overview.setRoe(dbl(data.get("ReturnOnEquityTTM")));
    overview.setRoa(dbl(data.get("ReturnOnAssetsTTM")));
    overview.setProfitMargin(dbl(data.get("ProfitMargin")));
    overview.setOperatingMargin(dbl(data.get("OperatingMarginTTM")));
    overview.setDividendYield(dbl(data.get("DividendYield")));
    overview.setBeta(dbl(data.get("Beta")));
    overview.setWeekHigh52(dbl(data.get("52WeekHigh")));
    overview.setWeekLow52(dbl(data.get("52WeekLow")));
    overview.setSharesOutstanding(lng(data.get("SharesOutstanding")));
    overview.setAnalystTargetPrice(dbl(data.get("AnalystTargetPrice")));
    overview.setDebtToEquity(dbl(data.get("DebtToEquity")));
    overview.setCurrentRatio(dbl(data.get("CurrentRatio")));
    overview.setRevenuePerShare(dbl(data.get("RevenuePerShareTTM")));
    overview.setBookValue(dbl(data.get("BookValue")));
    overview.setFetchedAt(LocalDateTime.now());
    overview.setExpiresAt(LocalDateTime.now().plusHours(24));

    return overviewRepo.save(overview);
  }

  @SuppressWarnings("unchecked")
  public List<FinancialStatement> fetchIncomeStatement(String symbol) {
    return fetchFinancialStatement(symbol, "INCOME_STATEMENT", "INCOME");
  }

  @SuppressWarnings("unchecked")
  public List<FinancialStatement> fetchBalanceSheet(String symbol) {
    return fetchFinancialStatement(symbol, "BALANCE_SHEET", "BALANCE_SHEET");
  }

  @SuppressWarnings("unchecked")
  public List<FinancialStatement> fetchCashFlow(String symbol) {
    return fetchFinancialStatement(symbol, "CASH_FLOW", "CASH_FLOW");
  }

  @SuppressWarnings("unchecked")
  private List<FinancialStatement> fetchFinancialStatement(
      String symbol, String function, String statementType) {
    String upper = symbol.toUpperCase();

    // Check cache
    List<FinancialStatement> cached =
        statementRepo.findBySymbolAndStatementTypeAndPeriod(upper, statementType, "annual");
    if (!cached.isEmpty()
        && cached.get(0).getExpiresAt() != null
        && cached.get(0).getExpiresAt().isAfter(LocalDateTime.now())) {
      log.info("[AlphaVantage] Returning cached {} for {}", statementType, upper);
      return cached;
    }

    Map<String, Object> data = callApi(function, upper);
    if (data.isEmpty()) {
      return cached;
    }

    List<Map<String, Object>> annualReports =
        (List<Map<String, Object>>) data.get("annualReports");
    List<Map<String, Object>> quarterlyReports =
        (List<Map<String, Object>>) data.get("quarterlyReports");

    List<FinancialStatement> results = new ArrayList<>();

    // Delete old cached data
    statementRepo.deleteBySymbolAndStatementTypeAndPeriod(upper, statementType, "annual");
    statementRepo.deleteBySymbolAndStatementTypeAndPeriod(upper, statementType, "quarterly");

    if (annualReports != null) {
      for (Map<String, Object> report : annualReports) {
        FinancialStatement stmt = new FinancialStatement();
        stmt.setSymbol(upper);
        stmt.setStatementType(statementType);
        stmt.setPeriod("annual");
        stmt.setFiscalDateEnding((String) report.get("fiscalDateEnding"));
        stmt.setData(report);
        stmt.setFetchedAt(LocalDateTime.now());
        stmt.setExpiresAt(LocalDateTime.now().plusDays(7));
        results.add(stmt);
      }
    }

    if (quarterlyReports != null) {
      for (Map<String, Object> report : quarterlyReports) {
        FinancialStatement stmt = new FinancialStatement();
        stmt.setSymbol(upper);
        stmt.setStatementType(statementType);
        stmt.setPeriod("quarterly");
        stmt.setFiscalDateEnding((String) report.get("fiscalDateEnding"));
        stmt.setData(report);
        stmt.setFetchedAt(LocalDateTime.now());
        stmt.setExpiresAt(LocalDateTime.now().plusDays(7));
        results.add(stmt);
      }
    }

    if (!results.isEmpty()) {
      statementRepo.saveAll(results);
    }
    return results.stream().filter(s -> "annual".equals(s.getPeriod())).toList();
  }

  @SuppressWarnings("unchecked")
  public List<EarningsData> fetchEarnings(String symbol) {
    String upper = symbol.toUpperCase();

    // Check cache
    List<EarningsData> cached = earningsRepo.findBySymbolAndPeriod(upper, "quarterly");
    if (!cached.isEmpty()
        && cached.get(0).getExpiresAt() != null
        && cached.get(0).getExpiresAt().isAfter(LocalDateTime.now())) {
      log.info("[AlphaVantage] Returning cached earnings for {}", upper);
      return cached;
    }

    Map<String, Object> data = callApi("EARNINGS", upper);
    if (data.isEmpty()) {
      return cached;
    }

    List<Map<String, Object>> annualEarnings =
        (List<Map<String, Object>>) data.get("annualEarnings");
    List<Map<String, Object>> quarterlyEarnings =
        (List<Map<String, Object>>) data.get("quarterlyEarnings");

    List<EarningsData> results = new ArrayList<>();

    // Delete old cached data
    earningsRepo.deleteBySymbolAndPeriod(upper, "annual");
    earningsRepo.deleteBySymbolAndPeriod(upper, "quarterly");

    if (annualEarnings != null) {
      for (Map<String, Object> e : annualEarnings) {
        EarningsData ed = new EarningsData();
        ed.setSymbol(upper);
        ed.setPeriod("annual");
        ed.setFiscalDateEnding((String) e.get("fiscalDateEnding"));
        ed.setReportedEPS(dbl(e.get("reportedEPS")));
        ed.setFetchedAt(LocalDateTime.now());
        ed.setExpiresAt(LocalDateTime.now().plusDays(7));
        results.add(ed);
      }
    }

    if (quarterlyEarnings != null) {
      for (Map<String, Object> e : quarterlyEarnings) {
        EarningsData ed = new EarningsData();
        ed.setSymbol(upper);
        ed.setPeriod("quarterly");
        ed.setFiscalDateEnding((String) e.get("fiscalDateEnding"));
        ed.setReportedEPS(dbl(e.get("reportedEPS")));
        ed.setEstimatedEPS(dbl(e.get("estimatedEPS")));
        ed.setSurprise(dbl(e.get("surprise")));
        ed.setSurprisePercentage(dbl(e.get("surprisePercentage")));
        ed.setFetchedAt(LocalDateTime.now());
        ed.setExpiresAt(LocalDateTime.now().plusDays(7));
        results.add(ed);
      }
    }

    if (!results.isEmpty()) {
      earningsRepo.saveAll(results);
    }
    return results.stream().filter(e -> "quarterly".equals(e.getPeriod())).toList();
  }

  private String str(Object val) {
    return val != null ? val.toString() : null;
  }

  private Double dbl(Object val) {
    if (val == null || "None".equals(val) || "-".equals(val)) return null;
    try {
      return Double.parseDouble(val.toString());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private Long lng(Object val) {
    if (val == null || "None".equals(val) || "-".equals(val)) return null;
    try {
      return Long.parseLong(val.toString());
    } catch (NumberFormatException e) {
      return null;
    }
  }
}
