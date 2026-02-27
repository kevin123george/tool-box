package dev.toolbox.models;

import java.time.Instant;
import java.time.LocalDate;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "recurring_transactions")
public class RecurringTransaction {

  @Id private String id;

  @Indexed private String userId;

  private String name;
  private double amount;
  private String category; // "INCOME" or "EXPENSE"
  private String
      categoryType; // The specific category enum value as string (e.g., "SALARY", "RENT")
  private TransactionFrequency frequency;
  private LocalDate nextDueDate;
  private boolean active = true;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant lastModified;

  public RecurringTransaction(
      String name,
      double amount,
      String category,
      String categoryType,
      TransactionFrequency frequency,
      LocalDate nextDueDate) {
    this.name = name;
    this.amount = amount;
    this.category = category;
    this.categoryType = categoryType;
    this.frequency = frequency;
    this.nextDueDate = nextDueDate;
  }

  public LocalDate calculateNextDueDate() {
    if (nextDueDate == null) return LocalDate.now();
    return switch (frequency) {
      case WEEKLY -> nextDueDate.plusWeeks(1);
      case MONTHLY -> nextDueDate.plusMonths(1);
      case YEARLY -> nextDueDate.plusYears(1);
    };
  }
}
