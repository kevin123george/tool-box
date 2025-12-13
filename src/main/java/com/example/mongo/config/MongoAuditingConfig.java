package com.example.mongo.config;

import java.time.Instant;
import java.util.Optional;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@Configuration
@EnableMongoAuditing(dateTimeProviderRef = "dateTimeProvider")
public class MongoAuditingConfig {

  @Bean
  public DateTimeProvider dateTimeProvider() {
    return () -> Optional.of(Instant.now());
  }
}
