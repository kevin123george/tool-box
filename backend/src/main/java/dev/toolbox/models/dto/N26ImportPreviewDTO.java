package dev.toolbox.models.dto;

import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class N26ImportPreviewDTO {
  private String pdfDocumentId;
  private List<N26TransactionDTO> transactions;
  private int totalTransactions;
  private int expenseCount;
  private int incomeCount;
  private double totalExpenses;
  private double totalIncome;

  public N26ImportPreviewDTO(
      List<N26TransactionDTO> transactions,
      int totalTransactions,
      int expenseCount,
      int incomeCount,
      double totalExpenses,
      double totalIncome) {
    this.transactions = transactions;
    this.totalTransactions = totalTransactions;
    this.expenseCount = expenseCount;
    this.incomeCount = incomeCount;
    this.totalExpenses = totalExpenses;
    this.totalIncome = totalIncome;
  }
}
