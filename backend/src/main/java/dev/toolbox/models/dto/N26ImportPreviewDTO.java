package dev.toolbox.models.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class N26ImportPreviewDTO {
  private List<N26TransactionDTO> transactions;
  private int totalTransactions;
  private int expenseCount;
  private int incomeCount;
  private double totalExpenses;
  private double totalIncome;
}
