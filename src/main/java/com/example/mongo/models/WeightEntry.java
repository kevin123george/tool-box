package com.example.mongo.models;

import java.time.Instant;
import java.time.LocalDate;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "weight_entries")
public class WeightEntry {

  @Id private String id;

  private LocalDate date;
  private Double weight; // in kg
  private String notes;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant updatedAt;

  public WeightEntry() {}

  public WeightEntry(LocalDate date, Double weight, String notes) {
    this.date = date;
    this.weight = weight;
    this.notes = notes;
  }
}
