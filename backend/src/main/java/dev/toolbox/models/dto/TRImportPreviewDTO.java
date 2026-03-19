package dev.toolbox.models.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TRImportPreviewDTO {
  private String pdfDocumentId;
  private String periodFrom;
  private String periodTo;
  private double cashBalance;
  private List<TRTradeDTO> trades;
  private List<TRIncomeDTO> income;
  private List<TRIncomeDTO> expenses; // card expenses, type=CARD
  private int tradeCount;
  private int incomeCount;
  private double totalIncome;
  private double totalExpenses;
}
