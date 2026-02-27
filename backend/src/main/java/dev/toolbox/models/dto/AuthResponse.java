package dev.toolbox.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
  private String token;
  private String userId;
  private String name;
  private String email;
  private String role;
}
