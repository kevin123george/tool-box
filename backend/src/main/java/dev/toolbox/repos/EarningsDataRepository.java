package dev.toolbox.repos;

import dev.toolbox.models.EarningsData;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EarningsDataRepository extends MongoRepository<EarningsData, String> {

  List<EarningsData> findBySymbolAndPeriod(String symbol, String period);

  void deleteBySymbolAndPeriod(String symbol, String period);
}
