package dev.toolbox.repos;

import dev.toolbox.models.PriceAlert;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PriceAlertRepository extends MongoRepository<PriceAlert, String> {

  List<PriceAlert> findByActiveTrue();

  List<PriceAlert> findBySymbol(String symbol);

  List<PriceAlert> findBySymbolAndActiveTrue(String symbol);

  List<PriceAlert> findByTriggeredTrue();

  List<PriceAlert> findAllByUserId(String userId);

  List<PriceAlert> findByActiveTrueAndUserId(String userId);

  List<PriceAlert> findBySymbolAndUserId(String symbol, String userId);
}
