package dev.toolbox.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class N26TransactionDTO {
  private String payee;
  private String date; // ISO: 2026-03-12
  private double amount; // always positive
  private String type; // EXPENSE or INCOME
  private String category; // ExpenseCategory or IncomeCategory enum name
  private String rawCategory; // raw N26 category line
  private double originalAmount; // negative for expenses
  private boolean selected; // default true — user can deselect
}
