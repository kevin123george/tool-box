package dev.toolbox.models;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "users")
public class UsersEntity {

  @Id private String id;
  private String name;

  @Indexed(unique = true)
  private String email;

  private String passwordHash;
  private String role = "USER";

  private Instant lastLoginAt;
  private Instant lastSeenAt;

  private String resetToken;
  private Instant resetTokenExpiry;

  private boolean emailNotificationsEnabled = true;

  @CreatedDate private Instant createdAt;
}
