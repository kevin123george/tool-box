package com.example.mongo.converter;

import java.time.YearMonth;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.stereotype.Component;

@Component
@WritingConverter
public class YearMonthToStringConverter implements Converter<YearMonth, String> {

  @Override
  public String convert(YearMonth source) {
    return source.toString(); // Converts to "2025-12" format
  }
}
