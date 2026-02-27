package dev.toolbox.models.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImportPreviewDTO {
  private String description;
  private double amount;
  private String suggestedCategory;
  private String type; // INCOME or EXPENSE
  private LocalDate date;
  private boolean included = true;
}
