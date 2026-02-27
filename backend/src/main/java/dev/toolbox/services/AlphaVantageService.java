package dev.toolbox.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.toolbox.models.CompanyOverview;
import dev.toolbox.models.EarningsData;
import dev.toolbox.models.FinancialStatement;
import dev.toolbox.repos.CompanyOverviewRepository;
import dev.toolbox.repos.EarningsDataRepository;
import dev.toolbox.repos.FinancialStatementRepository;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class AlphaVantageService {

  @Autowired private CompanyOverviewRepository overviewRepo;
  @Autowired private FinancialStatementRepository statementRepo;
  @Autowired private EarningsDataRepository earningsRepo;

  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * Find the project root directory. The script and venv live at the project root. When running via
   * gradle bootRun, CWD is the project root. When running the JAR from build/libs/, we need to go
   * up two levels.
   */
  private java.io.File findProjectRoot() {
    java.io.File cwd = new java.io.File(".");
    if (new java.io.File(cwd, "fundamentals_fetcher.py").exists()) return cwd;
    java.io.File upTwo = new java.io.File("../..");
    if (new java.io.File(upTwo, "fundamentals_fetcher.py").exists()) return upTwo;
    // Scripts copied next to jar by deploy.sh
    try {
      java.net.URL loc =
          AlphaVantageService.class.getProtectionDomain().getCodeSource().getLocation();
      java.io.File jarDir = new java.io.File(loc.toURI()).getParentFile();
      if (new java.io.File(jarDir, "fundamentals_fetcher.py").exists()) return jarDir;
    } catch (Exception ignored) {
    }
    return cwd;
  }

  private String findPythonExecutable(java.io.File projectRoot) {
    String[] candidates = {
      "../../../scripts/venv/bin/python3",
      projectRoot.getPath() + "/scripts/venv/bin/python3",
      projectRoot.getPath() + "/venv/bin/python3",
    };
    for (String path : candidates) {
      if (new java.io.File(path).exists()) return path;
    }
    return "python3";
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> callPython(String symbol, String command) {
    try {
      java.io.File projectRoot = findProjectRoot();
      String pythonExecutable = findPythonExecutable(projectRoot);
      String scriptPath =
          new java.io.File(projectRoot, "fundamentals_fetcher.py").getAbsolutePath();
      ProcessBuilder pb = new ProcessBuilder(pythonExecutable, scriptPath, symbol, command);
      pb.directory(projectRoot);
      pb.redirectErrorStream(true);

      Process process = pb.start();
      StringBuilder output = new StringBuilder();
      try (BufferedReader reader =
          new BufferedReader(new InputStreamReader(process.getInputStream()))) {
        String line;
        while ((line = reader.readLine()) != null) {
          output.append(line);
        }
      }

      int exitCode = process.waitFor();
      if (exitCode != 0) {
        log.error("[yfinance] Python script failed for {} {}: {}", symbol, command, output);
        return Collections.emptyMap();
      }

      Map<String, Object> result = objectMapper.readValue(output.toString(), Map.class);
      if (result.containsKey("error")) {
        log.error("[yfinance] Error for {} {}: {}", symbol, command, result.get("error"));
        return Collections.emptyMap();
      }
      return result;
    } catch (Exception e) {
      log.error(
          "[yfinance] Exception calling Python for {} {}: {}", symbol, command, e.getMessage());
      return Collections.emptyMap();
    }
  }

  public CompanyOverview fetchCompanyOverview(String symbol) {
    String upper = symbol.toUpperCase();

    // Clean up duplicates if any exist
    List<CompanyOverview> allCached = overviewRepo.findAllBySymbol(upper);
    if (allCached.size() > 1) {
      log.warn(
          "[yfinance] Found {} duplicate overviews for {}, cleaning up", allCached.size(), upper);
      overviewRepo.deleteBySymbol(upper);
      overviewRepo.save(allCached.get(0));
      allCached = List.of(allCached.get(0));
    }

    // Check cache first
    Optional<CompanyOverview> cached =
        allCached.isEmpty() ? Optional.empty() : Optional.of(allCached.get(0));
    if (cached.isPresent()
        && cached.get().getExpiresAt() != null
        && cached.get().getExpiresAt().isAfter(LocalDateTime.now())) {
      log.info("[yfinance] Returning cached overview for {}", upper);
      return cached.get();
    }

    log.info("[yfinance] Fetching overview for {}", upper);
    Map<String, Object> data = callPython(upper, "overview");
    if (data.isEmpty() || data.get("symbol") == null) {
      return cached.orElse(null);
    }

    CompanyOverview overview = cached.orElse(new CompanyOverview());
    overview.setSymbol(upper);
    overview.setName(str(data.get("name")));
    overview.setSector(str(data.get("sector")));
    overview.setIndustry(str(data.get("industry")));
    overview.setExchange(str(data.get("exchange")));
    overview.setMarketCap(dbl(data.get("marketCap")));
    overview.setPeRatio(dbl(data.get("peRatio")));
    overview.setPegRatio(dbl(data.get("pegRatio")));
    overview.setPbRatio(dbl(data.get("pbRatio")));
    overview.setPsRatio(dbl(data.get("psRatio")));
    overview.setEvToEbitda(dbl(data.get("evToEbitda")));
    overview.setEps(dbl(data.get("eps")));
    overview.setRoe(dbl(data.get("roe")));
    overview.setRoa(dbl(data.get("roa")));
    overview.setProfitMargin(dbl(data.get("profitMargin")));
    overview.setOperatingMargin(dbl(data.get("operatingMargin")));
    overview.setDividendYield(dbl(data.get("dividendYield")));
    overview.setBeta(dbl(data.get("beta")));
    overview.setWeekHigh52(dbl(data.get("weekHigh52")));
    overview.setWeekLow52(dbl(data.get("weekLow52")));
    overview.setSharesOutstanding(lng(data.get("sharesOutstanding")));
    overview.setAnalystTargetPrice(dbl(data.get("analystTargetPrice")));
    overview.setDebtToEquity(dbl(data.get("debtToEquity")));
    overview.setCurrentRatio(dbl(data.get("currentRatio")));
    overview.setRevenuePerShare(dbl(data.get("revenuePerShare")));
    overview.setBookValue(dbl(data.get("bookValue")));
    overview.setCurrentPrice(dbl(data.get("currentPrice")));
    overview.setFetchedAt(LocalDateTime.now());
    overview.setExpiresAt(LocalDateTime.now().plusHours(24));

    return overviewRepo.save(overview);
  }

  public List<FinancialStatement> fetchIncomeStatement(String symbol) {
    return fetchFinancialStatement(symbol, "income", "INCOME");
  }

  public List<FinancialStatement> fetchBalanceSheet(String symbol) {
    return fetchFinancialStatement(symbol, "balance_sheet", "BALANCE_SHEET");
  }

  public List<FinancialStatement> fetchCashFlow(String symbol) {
    return fetchFinancialStatement(symbol, "cash_flow", "CASH_FLOW");
  }

  @SuppressWarnings("unchecked")
  private List<FinancialStatement> fetchFinancialStatement(
      String symbol, String command, String statementType) {
    String upper = symbol.toUpperCase();

    // Check cache
    List<FinancialStatement> cached =
        statementRepo.findBySymbolAndStatementTypeAndPeriod(upper, statementType, "annual");
    if (!cached.isEmpty()
        && cached.get(0).getExpiresAt() != null
        && cached.get(0).getExpiresAt().isAfter(LocalDateTime.now())) {
      log.info("[yfinance] Returning cached {} for {}", statementType, upper);
      return cached;
    }

    log.info("[yfinance] Fetching {} for {}", command, upper);
    Map<String, Object> data = callPython(upper, command);
    if (data.isEmpty()) {
      return cached;
    }

    List<Map<String, Object>> annualReports = (List<Map<String, Object>>) data.get("annualReports");
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
        stmt.setData(normalizeKeys(report));
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
        stmt.setData(normalizeKeys(report));
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
      log.info("[yfinance] Returning cached earnings for {}", upper);
      return cached;
    }

    log.info("[yfinance] Fetching earnings for {}", upper);
    Map<String, Object> data = callPython(upper, "earnings");
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

  /**
   * Normalize yfinance field names (e.g. "Total Revenue") to camelCase keys (e.g. "totalRevenue")
   * that the FundamentalService expects.
   */
  private Map<String, Object> normalizeKeys(Map<String, Object> data) {
    Map<String, Object> normalized = new LinkedHashMap<>();
    for (Map.Entry<String, Object> entry : data.entrySet()) {
      String key = entry.getKey();
      // Map yfinance names to the keys FundamentalService uses
      String mapped =
          switch (key) {
            case "Total Revenue" -> "totalRevenue";
            case "Operating Revenue" -> "operatingRevenue";
            case "Gross Profit" -> "grossProfit";
            case "Operating Income" -> "operatingIncome";
            case "Net Income" -> "netIncome";
            case "Net Income Common Stockholders" -> "netIncomeCommonStockholders";
            case "Cost Of Revenue" -> "costOfRevenue";
            case "Operating Expense" -> "operatingExpense";
            case "Diluted EPS" -> "dilutedEPS";
            case "Basic EPS" -> "basicEPS";
            case "EBITDA" -> "ebitda";
            case "EBIT" -> "ebit";
            case "Operating Cash Flow" -> "operatingCashflow";
            case "Capital Expenditure" -> "capitalExpenditures";
            case "Free Cash Flow" -> "freeCashFlow";
            case "Cash Flow From Continuing Operating Activities" -> "operatingCashflow";
            case "Total Assets" -> "totalAssets";
            case "Total Liabilities Net Minority Interest" -> "totalLiabilities";
            case "Total Debt" -> "totalDebt";
            case "Stockholders Equity" -> "stockholdersEquity";
            case "Cash And Cash Equivalents" -> "cashAndCashEquivalents";
            case "Total Current Assets" -> "totalCurrentAssets";
            case "Total Current Liabilities" -> "totalCurrentLiabilities";
            case "Current Assets" -> "totalCurrentAssets";
            case "Current Liabilities" -> "totalCurrentLiabilities";
            case "Research And Development" -> "researchAndDevelopment";
            case "Selling General And Administration" -> "sellingGeneralAndAdministration";
            case "fiscalDateEnding" -> "fiscalDateEnding";
            default -> toCamelCase(key);
          };
      normalized.put(mapped, entry.getValue());
    }
    return normalized;
  }

  private String toCamelCase(String name) {
    if (name == null || name.isEmpty()) return name;
    String[] parts = name.split(" ");
    StringBuilder sb = new StringBuilder(parts[0].substring(0, 1).toLowerCase());
    sb.append(parts[0].substring(1));
    for (int i = 1; i < parts.length; i++) {
      if (!parts[i].isEmpty()) {
        sb.append(parts[i].substring(0, 1).toUpperCase());
        sb.append(parts[i].substring(1));
      }
    }
    return sb.toString();
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
      // yfinance may return sharesOutstanding as a double like 1.4681E10
      try {
        return Math.round(Double.parseDouble(val.toString()));
      } catch (NumberFormatException e2) {
        return null;
      }
    }
  }
}
