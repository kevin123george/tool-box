package dev.toolbox.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.ExpenseCategory;
import dev.toolbox.models.ExpenseRecord;
import dev.toolbox.models.IncomeCategory;
import dev.toolbox.models.IncomeRecord;
import dev.toolbox.models.StockHolding;
import dev.toolbox.models.dto.PdfDocumentDTO;
import dev.toolbox.models.dto.TRImportPreviewDTO;
import dev.toolbox.models.dto.TRIncomeDTO;
import dev.toolbox.models.dto.TRTradeDTO;
import dev.toolbox.repos.StockRepository;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
public class TRImportService {

  @Autowired private StockRepository holdingRepo;
  @Autowired private MonthlyBudgetService budgetService;
  @Autowired private PdfService pdfService;
  @Autowired private AuthUtils authUtils;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private File findProjectRoot() {
    File cwd = new File(".");
    if (new File(cwd, "tr_parser.py").exists()) return cwd;
    File upTwo = new File("../..");
    if (new File(upTwo, "tr_parser.py").exists()) return upTwo;
    try {
      java.net.URL loc =
          TRImportService.class.getProtectionDomain().getCodeSource().getLocation();
      File jarDir = new File(loc.toURI()).getParentFile();
      if (new File(jarDir, "tr_parser.py").exists()) return jarDir;
    } catch (Exception ignored) {
    }
    return cwd;
  }

  private String findPythonExecutable(File projectRoot) {
    String[] candidates = {
      "../../../scripts/venv/bin/python3",
      projectRoot.getPath() + "/scripts/venv/bin/python3",
      projectRoot.getPath() + "/venv/bin/python3",
    };
    for (String path : candidates) {
      if (new File(path).exists()) return path;
    }
    return "python3";
  }

  @SuppressWarnings("unchecked")
  public TRImportPreviewDTO preview(MultipartFile pdfFile) throws Exception {
    byte[] bytes = pdfFile.getBytes();
    String filename =
        pdfFile.getOriginalFilename() != null ? pdfFile.getOriginalFilename() : "tr-statement.pdf";

    File tempFile = Files.createTempFile("tr_", ".pdf").toFile();
    try {
      tempFile.getParentFile().mkdirs();
      java.nio.file.Files.write(tempFile.toPath(), bytes);

      File projectRoot = findProjectRoot();
      String pythonExecutable = findPythonExecutable(projectRoot);

      // Locate the script — check scripts/ subdir first, then same dir as jar
      File scriptFile = new File(projectRoot, "scripts/tr_parser.py");
      if (!scriptFile.exists()) {
        scriptFile = new File(projectRoot, "tr_parser.py");
      }
      if (!scriptFile.exists()) {
        File up = new File("../../scripts/tr_parser.py");
        if (up.exists()) scriptFile = up;
      }

      String scriptPath = scriptFile.getAbsolutePath();
      log.info(
          "[TRImport] Calling {} {} {}", pythonExecutable, scriptPath, tempFile.getAbsolutePath());

      ProcessBuilder pb =
          new ProcessBuilder(pythonExecutable, scriptPath, tempFile.getAbsolutePath());
      pb.directory(projectRoot);

      Process process = pb.start();
      StringBuilder output = new StringBuilder();
      StringBuilder errOutput = new StringBuilder();

      Thread stderrThread =
          new Thread(
              () -> {
                try (BufferedReader r =
                    new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                  String line;
                  while ((line = r.readLine()) != null) {
                    errOutput.append(line).append('\n');
                  }
                } catch (Exception ignored) {
                }
              });
      stderrThread.start();

      try (BufferedReader reader =
          new BufferedReader(new InputStreamReader(process.getInputStream()))) {
        String line;
        while ((line = reader.readLine()) != null) output.append(line);
      }

      stderrThread.join(5000);
      int exitCode = process.waitFor();

      if (exitCode != 0) {
        log.error("[TRImport] Python script failed (exit {}): stderr={}", exitCode, errOutput);
        throw new RuntimeException("PDF parser failed: " + errOutput);
      }

      String json = output.toString();
      if (json.isBlank()) {
        throw new RuntimeException("PDF parser returned empty output. stderr=" + errOutput);
      }

      Map<String, Object> result = objectMapper.readValue(json, Map.class);
      if (result.containsKey("error")) {
        throw new RuntimeException("PDF parser error: " + result.get("error"));
      }

      Map<String, Object> period = (Map<String, Object>) result.getOrDefault("period", Map.of());
      String periodFrom = (String) period.getOrDefault("from", null);
      String periodTo = (String) period.getOrDefault("to", null);
      double cashBalance = toDouble(result.get("cashBalance"));

      // Map trades
      List<Map<String, Object>> rawTrades =
          (List<Map<String, Object>>) result.getOrDefault("trades", new ArrayList<>());
      List<TRTradeDTO> trades = new ArrayList<>();
      for (Map<String, Object> t : rawTrades) {
        TRTradeDTO dto = new TRTradeDTO();
        dto.setDate((String) t.get("date"));
        dto.setAction((String) t.get("action"));
        dto.setIsin((String) t.get("isin"));
        dto.setName((String) t.getOrDefault("name", ""));
        dto.setQuantity(toDouble(t.get("quantity")));
        dto.setTotalEur(toDouble(t.get("totalEur")));
        dto.setPricePerShare(toDouble(t.get("pricePerShare")));
        dto.setSymbol((String) t.getOrDefault("isin", ""));
        dto.setSelected(true);
        trades.add(dto);
      }

      // Map income
      List<Map<String, Object>> rawIncome =
          (List<Map<String, Object>>) result.getOrDefault("income", new ArrayList<>());
      List<TRIncomeDTO> incomeList = new ArrayList<>();
      double totalIncome = 0;
      for (Map<String, Object> i : rawIncome) {
        TRIncomeDTO dto = new TRIncomeDTO();
        dto.setDate((String) i.get("date"));
        dto.setType((String) i.get("type"));
        dto.setDescription((String) i.getOrDefault("description", ""));
        dto.setIsin((String) i.get("isin"));
        dto.setAmountEur(toDouble(i.get("amountEur")));
        dto.setSelected(true);
        totalIncome += dto.getAmountEur();
        incomeList.add(dto);
      }

      // Map card expenses
      List<Map<String, Object>> rawExpenses =
          (List<Map<String, Object>>) result.getOrDefault("expenses", new ArrayList<>());
      List<TRIncomeDTO> expenseList = new ArrayList<>();
      double totalExpenses = 0;
      for (Map<String, Object> e : rawExpenses) {
        TRIncomeDTO dto = new TRIncomeDTO();
        dto.setDate((String) e.get("date"));
        dto.setType("CARD");
        dto.setDescription((String) e.getOrDefault("description", ""));
        dto.setIsin(null);
        dto.setAmountEur(toDouble(e.get("amountEur")));
        dto.setSelected(true);
        totalExpenses += dto.getAmountEur();
        expenseList.add(dto);
      }

      TRImportPreviewDTO preview = new TRImportPreviewDTO();
      preview.setPeriodFrom(periodFrom);
      preview.setPeriodTo(periodTo);
      preview.setCashBalance(cashBalance);
      preview.setTrades(trades);
      preview.setIncome(incomeList);
      preview.setExpenses(expenseList);
      preview.setTradeCount(trades.size());
      preview.setIncomeCount(incomeList.size());
      preview.setTotalIncome(totalIncome);
      preview.setTotalExpenses(totalExpenses);

      // Save PDF to MongoDB (GridFS) so it appears in the PDF reader
      try {
        PdfDocumentDTO saved = pdfService.uploadRaw(bytes, filename, "TradeRepublic");
        preview.setPdfDocumentId(saved.getId());
        log.info("[TRImport] PDF saved to MongoDB: {}", saved.getId());
      } catch (Exception e) {
        log.warn("[TRImport] Could not save PDF to MongoDB: {}", e.getMessage());
      }

      return preview;

    } finally {
      tempFile.delete();
    }
  }

  public Map<String, Integer> confirm(String userId, TRImportPreviewDTO preview) {
    int tradesImported = 0, incomeImported = 0, expensesImported = 0;

    // Process trades
    for (TRTradeDTO trade : preview.getTrades()) {
      if (!trade.isSelected()) continue;
      try {
        String symbol =
            trade.getSymbol() != null && !trade.getSymbol().isBlank()
                ? trade.getSymbol().toUpperCase()
                : trade.getIsin();
        LocalDate buyDate = LocalDate.parse(trade.getDate());

        if ("BUY".equals(trade.getAction())) {
          Optional<StockHolding> existing =
              holdingRepo.findFirstByUserIdAndIsinAndSoldFalse(userId, trade.getIsin());
          if (existing.isPresent()) {
            StockHolding h = existing.get();
            double newQty = h.getQuantity() + trade.getQuantity();
            double newAvgPrice =
                (h.getBuyPrice() * h.getQuantity() + trade.getTotalEur()) / newQty;
            h.setQuantity(newQty);
            h.setBuyPrice(newAvgPrice);
            holdingRepo.save(h);
          } else {
            StockHolding h = new StockHolding();
            h.setUserId(userId);
            h.setSymbol(symbol);
            h.setIsin(trade.getIsin());
            h.setQuantity(trade.getQuantity());
            h.setBuyPrice(trade.getPricePerShare());
            h.setBuyDate(buyDate);
            h.setCurrency("EUR");
            h.setSold(false);
            holdingRepo.save(h);
          }
          tradesImported++;
        } else if ("SELL".equals(trade.getAction())) {
          Optional<StockHolding> existing =
              holdingRepo.findFirstByUserIdAndIsinAndSoldFalse(userId, trade.getIsin());
          if (existing.isPresent()) {
            StockHolding h = existing.get();
            double remaining = h.getQuantity() - trade.getQuantity();
            if (remaining <= 0.001) {
              h.setSold(true);
            } else {
              h.setQuantity(remaining);
            }
            holdingRepo.save(h);
          }
          tradesImported++;
        }
      } catch (Exception e) {
        log.error("[TRImport] Trade import failed: {}", e.getMessage());
      }
    }

    // Process income (INTEREST, DIVIDEND) → budget
    for (TRIncomeDTO inc : preview.getIncome()) {
      if (!inc.isSelected()) continue;
      try {
        String[] parts = inc.getDate().split("-");
        YearMonth ym =
            YearMonth.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
        Instant ts = Instant.parse(inc.getDate() + "T12:00:00Z");
        IncomeCategory cat =
            "DIVIDEND".equals(inc.getType()) ? IncomeCategory.DIVIDEND : IncomeCategory.INTEREST;
        budgetService.addIncome(ym, new IncomeRecord(cat, inc.getAmountEur(), inc.getDescription(), ts), userId);
        incomeImported++;
      } catch (Exception e) {
        log.error("[TRImport] Income import failed: {}", e.getMessage());
      }
    }

    // Process card expenses → budget
    for (TRIncomeDTO exp : preview.getExpenses()) {
      if (!exp.isSelected()) continue;
      try {
        String[] parts = exp.getDate().split("-");
        YearMonth ym =
            YearMonth.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
        Instant ts = Instant.parse(exp.getDate() + "T12:00:00Z");
        budgetService.addExpense(
            ym,
            new ExpenseRecord(ExpenseCategory.OTHER, exp.getAmountEur(), exp.getDescription(), ts),
            userId);
        expensesImported++;
      } catch (Exception e) {
        log.error("[TRImport] Expense import failed: {}", e.getMessage());
      }
    }

    return Map.of("trades", tradesImported, "income", incomeImported, "expenses", expensesImported);
  }

  private double toDouble(Object val) {
    if (val == null) return 0.0;
    try {
      return Double.parseDouble(val.toString());
    } catch (NumberFormatException e) {
      return 0.0;
    }
  }
}
