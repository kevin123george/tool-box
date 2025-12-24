package com.example.mongo.models;

import java.time.LocalDateTime;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "push_subscriptions")
public class PushSubscription {
  @Id private String id;
  private String endpoint;
  private String p256dh;
  private String auth;
  private String deviceName;
  private String userAgent;
  private LocalDateTime subscribedAt;
  private LocalDateTime lastUsed;
}
