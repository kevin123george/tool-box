package dev.toolbox.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TRIncomeDTO {
  private String date;
  private String type; // INTEREST, DIVIDEND, or CARD
  private String description;
  private String isin;
  private double amountEur;
  private boolean selected;
}
