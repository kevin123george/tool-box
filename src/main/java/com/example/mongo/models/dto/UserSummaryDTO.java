package com.example.mongo.models.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserSummaryDTO {
  private String id;
  private String name;
  private String email;
  private String role;
  private Instant createdAt;
}
