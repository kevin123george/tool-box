package com.example.mongo.converter;

import java.time.YearMonth;
import lombok.NonNull;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.stereotype.Component;

@Component
@ReadingConverter
public class StringToYearMonthConverter implements Converter<String, YearMonth> {

  @Override
  public YearMonth convert(@NonNull String source) {
    return YearMonth.parse(source); // Parses "2025-12" format
  }
}
