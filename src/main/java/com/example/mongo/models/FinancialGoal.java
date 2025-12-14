package com.example.mongo.models;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "financial_goals")
public class FinancialGoal {

  @Id private String id;

  private double targetYearlyIncome; // AFTER tax
  private double taxRate; // Example: 0.208
  private double expectedReturnRate; // Example: 0.07
  private double currentCorpus; // Pulled from bank accounts
  private double yearlyContribution; // Annual savings

  private int currentAge;
  private int retirementAgeGoal; // Optional: user-set goal

  private double requiredCorpus; // Calculated
  private boolean goalAchieved; // True when corpus >= requiredCorpus

  private Integer yearsToGoal; // Calculated
  private Integer goalAchievedAge; // Calculated age when goal is achieved

  private double finalProjectedCorpus; // Final corpus after projection

  @LastModifiedDate private Instant lastModified;

  @CreatedDate private Instant createdAt;
}
