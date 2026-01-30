package com.example.mongo.models;

import java.time.Instant;
import java.time.LocalDate;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "subscriptions")
public class Subscription {

  @Id private String id;

  private String name;
  private String provider;
  private double amount;
  private String currency = "EUR";
  private BillingCycle billingCycle;
  private LocalDate nextBillingDate;
  private String category;
  private boolean active = true;
  private String notes;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant lastModified;

  public Subscription(String name, String provider, double amount, BillingCycle billingCycle) {
    this.name = name;
    this.provider = provider;
    this.amount = amount;
    this.billingCycle = billingCycle;
  }

  public double getMonthlyEquivalent() {
    return switch (billingCycle) {
      case WEEKLY -> amount * 4.33;
      case MONTHLY -> amount;
      case YEARLY -> amount / 12.0;
    };
  }

  public double getAnnualEquivalent() {
    return switch (billingCycle) {
      case WEEKLY -> amount * 52;
      case MONTHLY -> amount * 12;
      case YEARLY -> amount;
    };
  }
}
