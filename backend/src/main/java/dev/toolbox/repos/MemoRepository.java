package dev.toolbox.repos;

import dev.toolbox.models.Memo;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoRepository extends MongoRepository<Memo, String> {

  Page<Memo> findAllByUserId(String userId, Pageable pageable);

  Page<Memo> findAllByUserIdAndCategory(String userId, Memo.Category category, Pageable pageable);

  List<Memo> findAllByUserId(String userId);
}
