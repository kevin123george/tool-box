package com.example.mongo.services;

import com.example.mongo.models.CompanyOverview;
import com.example.mongo.models.ScreenerEntry;
import com.example.mongo.models.dto.ScreenerFilterDTO;
import com.example.mongo.repos.ScreenerEntryRepository;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class ScreenerService {

  @Autowired private ScreenerEntryRepository screenerRepo;
  @Autowired private AlphaVantageService alphaVantageService;
  @Autowired private MongoTemplate mongoTemplate;

  public ScreenerEntry addSymbol(String symbol) {
    String upper = symbol.toUpperCase();

    // Clean up duplicates if any exist
    List<ScreenerEntry> allExisting = screenerRepo.findAllBySymbol(upper);
    if (allExisting.size() > 1) {
      log.warn("[screener] Found {} duplicates for {}, cleaning up", allExisting.size(), upper);
      screenerRepo.deleteBySymbol(upper);
      screenerRepo.save(allExisting.get(0));
      allExisting = List.of(allExisting.get(0));
    }

    // Check if already exists and not expired
    Optional<ScreenerEntry> existing =
        allExisting.isEmpty() ? Optional.empty() : Optional.of(allExisting.get(0));
    if (existing.isPresent()
        && existing.get().getExpiresAt() != null
        && existing.get().getExpiresAt().isAfter(LocalDateTime.now())) {
      return existing.get();
    }

    CompanyOverview overview = alphaVantageService.fetchCompanyOverview(upper);
    if (overview == null) {
      return null;
    }

    ScreenerEntry entry = existing.orElse(new ScreenerEntry());
    entry.setSymbol(upper);
    entry.setName(overview.getName());
    entry.setSector(overview.getSector());
    entry.setIndustry(overview.getIndustry());
    entry.setMarketCap(overview.getMarketCap());
    entry.setPeRatio(overview.getPeRatio());
    entry.setPbRatio(overview.getPbRatio());
    entry.setDividendYield(overview.getDividendYield());
    entry.setEps(overview.getEps());
    entry.setRoe(overview.getRoe());
    entry.setDebtToEquity(overview.getDebtToEquity());
    entry.setProfitMargin(overview.getProfitMargin());
    entry.setFetchedAt(LocalDateTime.now());
    entry.setExpiresAt(LocalDateTime.now().plusHours(24));

    return screenerRepo.save(entry);
  }

  public Map<String, Object> search(ScreenerFilterDTO filters) {
    Query query = new Query();
    List<Criteria> criteriaList = new ArrayList<>();

    if (filters.getMinPE() != null) {
      criteriaList.add(Criteria.where("peRatio").gte(filters.getMinPE()));
    }
    if (filters.getMaxPE() != null) {
      criteriaList.add(Criteria.where("peRatio").lte(filters.getMaxPE()));
    }
    if (filters.getMinMarketCap() != null) {
      criteriaList.add(Criteria.where("marketCap").gte(filters.getMinMarketCap()));
    }
    if (filters.getMaxMarketCap() != null) {
      criteriaList.add(Criteria.where("marketCap").lte(filters.getMaxMarketCap()));
    }
    if (filters.getMinDividendYield() != null) {
      criteriaList.add(Criteria.where("dividendYield").gte(filters.getMinDividendYield()));
    }
    if (filters.getSector() != null && !filters.getSector().isEmpty()) {
      criteriaList.add(Criteria.where("sector").is(filters.getSector()));
    }
    if (filters.getMinROE() != null) {
      criteriaList.add(Criteria.where("roe").gte(filters.getMinROE()));
    }
    if (filters.getMaxDebtToEquity() != null) {
      criteriaList.add(Criteria.where("debtToEquity").lte(filters.getMaxDebtToEquity()));
    }

    if (!criteriaList.isEmpty()) {
      query.addCriteria(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
    }

    // Sorting
    String sortField = filters.getSortBy() != null ? filters.getSortBy() : "marketCap";
    Sort.Direction direction =
        "asc".equalsIgnoreCase(filters.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
    query.with(Sort.by(direction, sortField));

    long total = mongoTemplate.count(query, ScreenerEntry.class);

    // Pagination
    int page = filters.getPage() != null ? filters.getPage() : 0;
    int size = filters.getSize() != null ? filters.getSize() : 20;
    query.skip((long) page * size).limit(size);

    List<ScreenerEntry> entries = mongoTemplate.find(query, ScreenerEntry.class);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("content", entries);
    result.put("totalElements", total);
    result.put("totalPages", (int) Math.ceil((double) total / size));
    result.put("page", page);
    result.put("size", size);
    return result;
  }

  public List<String> getSectors() {
    return mongoTemplate
        .findDistinct(new Query(), "sector", ScreenerEntry.class, String.class)
        .stream()
        .filter(s -> s != null && !s.isEmpty())
        .sorted()
        .collect(Collectors.toList());
  }
}
