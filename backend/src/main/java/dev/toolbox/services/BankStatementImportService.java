package dev.toolbox.services;

import dev.toolbox.models.ExpenseCategory;
import dev.toolbox.models.ExpenseRecord;
import dev.toolbox.models.IncomeCategory;
import dev.toolbox.models.IncomeRecord;
import dev.toolbox.models.dto.ImportPreviewDTO;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
public class BankStatementImportService {

  @Autowired private MonthlyBudgetService budgetService;

  // Keyword mappings for auto-categorization
  private static final Map<String, String> EXPENSE_KEYWORDS = new HashMap<>();
  private static final Map<String, String> INCOME_KEYWORDS = new HashMap<>();

  static {
    // Expense keywords
    EXPENSE_KEYWORDS.put("rewe", "GROCERIES");
    EXPENSE_KEYWORDS.put("edeka", "GROCERIES");
    EXPENSE_KEYWORDS.put("aldi", "GROCERIES");
    EXPENSE_KEYWORDS.put("lidl", "GROCERIES");
    EXPENSE_KEYWORDS.put("netto", "GROCERIES");
    EXPENSE_KEYWORDS.put("penny", "GROCERIES");
    EXPENSE_KEYWORDS.put("kaufland", "GROCERIES");
    EXPENSE_KEYWORDS.put("netflix", "SUBSCRIPTIONS");
    EXPENSE_KEYWORDS.put("spotify", "SUBSCRIPTIONS");
    EXPENSE_KEYWORDS.put("disney", "SUBSCRIPTIONS");
    EXPENSE_KEYWORDS.put("amazon prime", "SUBSCRIPTIONS");
    EXPENSE_KEYWORDS.put("youtube", "SUBSCRIPTIONS");
    EXPENSE_KEYWORDS.put("apple", "SUBSCRIPTIONS");
    EXPENSE_KEYWORDS.put("miete", "RENT");
    EXPENSE_KEYWORDS.put("rent", "RENT");
    EXPENSE_KEYWORDS.put("telekom", "INTERNET");
    EXPENSE_KEYWORDS.put("vodafone", "INTERNET");
    EXPENSE_KEYWORDS.put("o2", "INTERNET");
    EXPENSE_KEYWORDS.put("db bahn", "TRANSPORT");
    EXPENSE_KEYWORDS.put("deutsche bahn", "TRANSPORT");
    EXPENSE_KEYWORDS.put("uber", "TRANSPORT");
    EXPENSE_KEYWORDS.put("taxi", "TRANSPORT");
    EXPENSE_KEYWORDS.put("shell", "FUEL");
    EXPENSE_KEYWORDS.put("aral", "FUEL");
    EXPENSE_KEYWORDS.put("total", "FUEL");
    EXPENSE_KEYWORDS.put("esso", "FUEL");
    EXPENSE_KEYWORDS.put("tankstelle", "FUEL");
    EXPENSE_KEYWORDS.put("restaurant", "DINING_OUT");
    EXPENSE_KEYWORDS.put("mcdonald", "DINING_OUT");
    EXPENSE_KEYWORDS.put("burger king", "DINING_OUT");
    EXPENSE_KEYWORDS.put("kfc", "DINING_OUT");
    EXPENSE_KEYWORDS.put("starbucks", "DINING_OUT");
    EXPENSE_KEYWORDS.put("lieferando", "DINING_OUT");
    EXPENSE_KEYWORDS.put("gym", "GYM");
    EXPENSE_KEYWORDS.put("fitness", "GYM");
    EXPENSE_KEYWORDS.put("mcfit", "GYM");

    // Income keywords
    INCOME_KEYWORDS.put("gehalt", "SALARY");
    INCOME_KEYWORDS.put("salary", "SALARY");
    INCOME_KEYWORDS.put("lohn", "SALARY");
    INCOME_KEYWORDS.put("bonus", "BONUS");
    INCOME_KEYWORDS.put("dividende", "DIVIDEND");
    INCOME_KEYWORDS.put("dividend", "DIVIDEND");
    INCOME_KEYWORDS.put("zinsen", "INTEREST");
    INCOME_KEYWORDS.put("interest", "INTEREST");
  }

  public List<ImportPreviewDTO> parseCSV(MultipartFile file, String format) throws Exception {
    List<ImportPreviewDTO> previews = new ArrayList<>();

    try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
      String line;
      boolean isHeader = true;

      while ((line = reader.readLine()) != null) {
        if (isHeader) {
          isHeader = false;
          continue;
        }

        if (line.trim().isEmpty()) continue;

        ImportPreviewDTO preview = parseLine(line, format);
        if (preview != null) {
          previews.add(preview);
        }
      }
    }

    return previews;
  }

  private ImportPreviewDTO parseLine(String line, String format) {
    try {
      String[] parts = line.split(";");
      if (parts.length < 4) {
        parts = line.split(",");
      }

      String description;
      double amount;
      LocalDate date;

      if ("N26".equalsIgnoreCase(format)) {
        // N26 format: Date, Recipient, Account, Type, Category, Amount, Currency, ...
        date = parseDate(parts[0].replace("\"", "").trim());
        description = parts[1].replace("\"", "").trim();
        amount = parseAmount(parts[5].replace("\"", "").trim());
      } else if ("SPARKASSE".equalsIgnoreCase(format)) {
        // Sparkasse format: Buchungstag, Wertstellung, Buchungstext, Verwendungszweck, Betrag, ...
        date = parseDate(parts[0].replace("\"", "").trim());
        description = parts[3].replace("\"", "").trim();
        amount = parseAmount(parts[4].replace("\"", "").trim());
      } else {
        // Auto-detect: try to find date, description, and amount
        date = findDate(parts);
        description = findDescription(parts);
        amount = findAmount(parts);
      }

      if (description == null || date == null) return null;

      String type = amount >= 0 ? "INCOME" : "EXPENSE";
      String suggestedCategory = categorize(description.toLowerCase(), type);

      return new ImportPreviewDTO(
          description, Math.abs(amount), suggestedCategory, type, date, true);
    } catch (Exception e) {
      log.warn("Failed to parse line: {} - {}", line, e.getMessage());
      return null;
    }
  }

  private LocalDate parseDate(String dateStr) {
    List<DateTimeFormatter> formatters =
        List.of(
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"));

    for (DateTimeFormatter formatter : formatters) {
      try {
        return LocalDate.parse(dateStr, formatter);
      } catch (Exception ignored) {
      }
    }
    return null;
  }

  private double parseAmount(String amountStr) {
    // Handle German number format (1.234,56 -> 1234.56)
    String cleaned = amountStr.replace(".", "").replace(",", ".").replace("€", "").trim();
    return Double.parseDouble(cleaned);
  }

  private LocalDate findDate(String[] parts) {
    for (String part : parts) {
      LocalDate date = parseDate(part.replace("\"", "").trim());
      if (date != null) return date;
    }
    return null;
  }

  private String findDescription(String[] parts) {
    // Return the longest non-numeric string as description
    String best = null;
    for (String part : parts) {
      String cleaned = part.replace("\"", "").trim();
      if (!cleaned.isEmpty()
          && !cleaned.matches("^[\\d.,€\\-+]+$")
          && (best == null || cleaned.length() > best.length())) {
        best = cleaned;
      }
    }
    return best;
  }

  private double findAmount(String[] parts) {
    for (String part : parts) {
      try {
        double amount = parseAmount(part.replace("\"", "").trim());
        if (amount != 0) return amount;
      } catch (Exception ignored) {
      }
    }
    return 0;
  }

  private String categorize(String description, String type) {
    if ("INCOME".equals(type)) {
      for (Map.Entry<String, String> entry : INCOME_KEYWORDS.entrySet()) {
        if (description.contains(entry.getKey())) {
          return entry.getValue();
        }
      }
      return "OTHER";
    } else {
      for (Map.Entry<String, String> entry : EXPENSE_KEYWORDS.entrySet()) {
        if (description.contains(entry.getKey())) {
          return entry.getValue();
        }
      }
      return "OTHER";
    }
  }

  public void confirmImport(int year, int month, List<ImportPreviewDTO> items) {
    YearMonth yearMonth = YearMonth.of(year, month);

    for (ImportPreviewDTO item : items) {
      if (!item.isIncluded()) continue;

      try {
        if ("INCOME".equals(item.getType())) {
          IncomeCategory category = IncomeCategory.valueOf(item.getSuggestedCategory());
          IncomeRecord record = new IncomeRecord(category, item.getAmount(), item.getDescription());
          budgetService.addIncome(yearMonth, record);
        } else {
          ExpenseCategory category = ExpenseCategory.valueOf(item.getSuggestedCategory());
          ExpenseRecord record =
              new ExpenseRecord(category, item.getAmount(), item.getDescription());
          budgetService.addExpense(yearMonth, record);
        }
      } catch (Exception e) {
        log.error("Failed to import item {}: {}", item.getDescription(), e.getMessage());
      }
    }
  }
}
