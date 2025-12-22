package com.example.mongo.config;

import com.example.mongo.converter.StringToYearMonthConverter;
import com.example.mongo.converter.YearMonthToStringConverter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

@Configuration
@EnableMongoAuditing(dateTimeProviderRef = "dateTimeProvider")
public class MongoAuditingConfig {

  @Bean
  public DateTimeProvider dateTimeProvider() {
    return () -> Optional.of(Instant.now());
  }

  @Bean
  public MongoCustomConversions customConversions() {
    List<Object> converters = new ArrayList<>();
    converters.add(new YearMonthToStringConverter());
    converters.add(new StringToYearMonthConverter());
    return new MongoCustomConversions(converters);
  }
}
