package dev.toolbox.repos;

import dev.toolbox.models.StockHolding;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockRepository extends MongoRepository<StockHolding, String> {

  List<StockHolding> findAllByUserId(String userId);

  List<StockHolding> findByUserIdAndSoldFalse(String userId);
}
