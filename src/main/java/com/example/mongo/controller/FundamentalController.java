package com.example.mongo.controller;

import com.example.mongo.models.CompanyOverview;
import com.example.mongo.models.EarningsData;
import com.example.mongo.models.FinancialStatement;
import com.example.mongo.models.dto.FundamentalDataDTO;
import com.example.mongo.repos.FinancialStatementRepository;
import com.example.mongo.services.AlphaVantageService;
import com.example.mongo.services.FundamentalService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fundamentals")
public class FundamentalController {

  @Autowired private FundamentalService fundamentalService;
  @Autowired private AlphaVantageService alphaVantageService;
  @Autowired private FinancialStatementRepository statementRepo;

  @GetMapping("/{symbol}")
  public ResponseEntity<FundamentalDataDTO> getFundamentals(@PathVariable String symbol) {
    FundamentalDataDTO data = fundamentalService.getFundamentals(symbol);
    return ResponseEntity.ok(data);
  }

  @GetMapping("/{symbol}/overview")
  public ResponseEntity<CompanyOverview> getOverview(@PathVariable String symbol) {
    CompanyOverview overview = alphaVantageService.fetchCompanyOverview(symbol);
    if (overview == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(overview);
  }

  @GetMapping("/{symbol}/income")
  public ResponseEntity<List<FinancialStatement>> getIncomeStatement(
      @PathVariable String symbol, @RequestParam(defaultValue = "annual") String period) {
    List<FinancialStatement> statements = alphaVantageService.fetchIncomeStatement(symbol);
    if ("quarterly".equals(period)) {
      statements =
          statementRepo.findBySymbolAndStatementTypeAndPeriod(
              symbol.toUpperCase(), "INCOME", "quarterly");
    }
    return ResponseEntity.ok(statements);
  }

  @GetMapping("/{symbol}/balance-sheet")
  public ResponseEntity<List<FinancialStatement>> getBalanceSheet(
      @PathVariable String symbol, @RequestParam(defaultValue = "annual") String period) {
    List<FinancialStatement> statements = alphaVantageService.fetchBalanceSheet(symbol);
    if ("quarterly".equals(period)) {
      statements =
          statementRepo.findBySymbolAndStatementTypeAndPeriod(
              symbol.toUpperCase(), "BALANCE_SHEET", "quarterly");
    }
    return ResponseEntity.ok(statements);
  }

  @GetMapping("/{symbol}/cash-flow")
  public ResponseEntity<List<FinancialStatement>> getCashFlow(
      @PathVariable String symbol, @RequestParam(defaultValue = "annual") String period) {
    List<FinancialStatement> statements = alphaVantageService.fetchCashFlow(symbol);
    if ("quarterly".equals(period)) {
      statements =
          statementRepo.findBySymbolAndStatementTypeAndPeriod(
              symbol.toUpperCase(), "CASH_FLOW", "quarterly");
    }
    return ResponseEntity.ok(statements);
  }

  @GetMapping("/{symbol}/earnings")
  public ResponseEntity<List<EarningsData>> getEarnings(
      @PathVariable String symbol, @RequestParam(defaultValue = "quarterly") String period) {
    List<EarningsData> earnings = alphaVantageService.fetchEarnings(symbol);
    return ResponseEntity.ok(earnings);
  }

  @GetMapping("/{symbol}/ratios")
  public ResponseEntity<Map<String, Object>> getRatios(@PathVariable String symbol) {
    return ResponseEntity.ok(fundamentalService.getKeyRatios(symbol));
  }

  @GetMapping("/{symbol}/margins")
  public ResponseEntity<Map<String, Object>> getMargins(@PathVariable String symbol) {
    return ResponseEntity.ok(fundamentalService.getMargins(symbol));
  }

  @GetMapping("/{symbol}/revenue")
  public ResponseEntity<List<Map<String, Object>>> getRevenue(@PathVariable String symbol) {
    return ResponseEntity.ok(fundamentalService.getRevenueHistory(symbol));
  }

  @GetMapping("/{symbol}/eps")
  public ResponseEntity<List<Map<String, Object>>> getEPS(@PathVariable String symbol) {
    return ResponseEntity.ok(fundamentalService.getEPSHistory(symbol));
  }

  @GetMapping("/{symbol}/fcf")
  public ResponseEntity<List<Map<String, Object>>> getFCF(@PathVariable String symbol) {
    return ResponseEntity.ok(fundamentalService.getFCFHistory(symbol));
  }
}
