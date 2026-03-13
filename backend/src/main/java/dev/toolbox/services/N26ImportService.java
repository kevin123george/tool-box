package dev.toolbox.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.toolbox.models.ExpenseCategory;
import dev.toolbox.models.ExpenseRecord;
import dev.toolbox.models.IncomeCategory;
import dev.toolbox.models.IncomeRecord;
import dev.toolbox.models.dto.N26ImportPreviewDTO;
import dev.toolbox.models.dto.N26TransactionDTO;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.time.Instant;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
public class N26ImportService {

  @Autowired private MonthlyBudgetService budgetService;
  @Autowired private PdfService pdfService;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private File findProjectRoot() {
    File cwd = new File(".");
    if (new File(cwd, "n26_parser.py").exists()) return cwd;
    File upTwo = new File("../..");
    if (new File(upTwo, "n26_parser.py").exists()) return upTwo;
    try {
      java.net.URL loc =
          N26ImportService.class.getProtectionDomain().getCodeSource().getLocation();
      File jarDir = new File(loc.toURI()).getParentFile();
      if (new File(jarDir, "n26_parser.py").exists()) return jarDir;
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
  public N26ImportPreviewDTO previewPdf(MultipartFile pdfFile) throws Exception {
    // Read bytes once — used for both parsing and GridFS storage
    byte[] pdfBytes = pdfFile.getBytes();
    String originalFilename =
        pdfFile.getOriginalFilename() != null ? pdfFile.getOriginalFilename() : "n26-statement.pdf";

    // Save PDF to temp file
    File tempFile = Files.createTempFile("n26_", ".pdf").toFile();
    try {
      tempFile.getParentFile().mkdirs();
      java.nio.file.Files.write(tempFile.toPath(), pdfBytes);

      File projectRoot = findProjectRoot();
      String pythonExecutable = findPythonExecutable(projectRoot);

      // Locate the script — check scripts/ subdir first, then same dir as n26_parser.py
      File scriptFile = new File(projectRoot, "scripts/n26_parser.py");
      if (!scriptFile.exists()) {
        scriptFile = new File(projectRoot, "n26_parser.py");
      }
      // Fallback: walk up from cwd to find scripts/n26_parser.py
      if (!scriptFile.exists()) {
        File up = new File("../../scripts/n26_parser.py");
        if (up.exists()) scriptFile = up;
      }

      String scriptPath = scriptFile.getAbsolutePath();
      log.info("[N26Import] Calling {} {} {}", pythonExecutable, scriptPath, tempFile.getAbsolutePath());

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
        log.error("[N26Import] Python script failed (exit {}): stderr={}", exitCode, errOutput);
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

      List<Map<String, Object>> rawTx = (List<Map<String, Object>>) result.get("transactions");
      if (rawTx == null) rawTx = new ArrayList<>();

      List<N26TransactionDTO> transactions = new ArrayList<>();
      double totalExpenses = 0;
      double totalIncome = 0;
      int expenseCount = 0;
      int incomeCount = 0;

      for (Map<String, Object> tx : rawTx) {
        N26TransactionDTO dto = new N26TransactionDTO();
        dto.setPayee((String) tx.get("payee"));
        dto.setDate((String) tx.get("date"));
        dto.setAmount(toDouble(tx.get("amount")));
        dto.setType((String) tx.get("type"));
        dto.setCategory((String) tx.get("category"));
        dto.setRawCategory((String) tx.get("rawCategory"));
        dto.setOriginalAmount(toDouble(tx.get("originalAmount")));
        dto.setSelected(true);

        if ("EXPENSE".equals(dto.getType())) {
          totalExpenses += dto.getAmount();
          expenseCount++;
        } else {
          totalIncome += dto.getAmount();
          incomeCount++;
        }

        transactions.add(dto);
      }

      N26ImportPreviewDTO dto =
          new N26ImportPreviewDTO(
              transactions,
              transactions.size(),
              expenseCount,
              incomeCount,
              totalExpenses,
              totalIncome);

      // Save PDF to MongoDB (GridFS) so it appears in the PDF reader
      try {
        dev.toolbox.models.dto.PdfDocumentDTO saved =
            pdfService.uploadRaw(pdfBytes, originalFilename, "N26");
        dto.setPdfDocumentId(saved.getId());
        log.info("[N26Import] PDF saved to MongoDB: {}", saved.getId());
      } catch (Exception e) {
        log.warn("[N26Import] Could not save PDF to MongoDB: {}", e.getMessage());
      }

      return dto;

    } finally {
      tempFile.delete();
    }
  }

  public int importTransactions(String userId, List<N26TransactionDTO> transactions) {
    int imported = 0;

    for (N26TransactionDTO tx : transactions) {
      if (!tx.isSelected()) continue;

      try {
        // Parse date
        String[] parts = tx.getDate().split("-");
        YearMonth yearMonth = YearMonth.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
        Instant recordDate = Instant.parse(tx.getDate() + "T12:00:00Z");

        if ("EXPENSE".equals(tx.getType())) {
          ExpenseCategory category;
          try {
            category = ExpenseCategory.valueOf(tx.getCategory());
          } catch (IllegalArgumentException e) {
            category = ExpenseCategory.OTHER;
          }
          ExpenseRecord record =
              new ExpenseRecord(category, tx.getAmount(), tx.getPayee(), recordDate);
          budgetService.addExpense(yearMonth, record, userId);
        } else {
          IncomeCategory category;
          try {
            category = IncomeCategory.valueOf(tx.getCategory());
          } catch (IllegalArgumentException e) {
            category = IncomeCategory.OTHER;
          }
          IncomeRecord record =
              new IncomeRecord(category, tx.getAmount(), tx.getPayee(), recordDate);
          budgetService.addIncome(yearMonth, record, userId);
        }

        imported++;
      } catch (Exception e) {
        log.error("[N26Import] Failed to import transaction {}: {}", tx.getPayee(), e.getMessage());
      }
    }

    return imported;
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
