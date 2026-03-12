package dev.toolbox.repos;

import dev.toolbox.models.Note;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NoteRepository extends MongoRepository<Note, String> {

  Page<Note> findAllByUserId(String userId, Pageable pageable);

  Page<Note> findAllByUserIdAndFolderId(String userId, String folderId, Pageable pageable);

  Page<Note> findAllByUserIdAndTagsContaining(String userId, String tag, Pageable pageable);

  List<Note> findAllByUserId(String userId);

  List<Note> findAllByUserIdAndFolderId(String userId, String folderId);

  @Query(
      "{ 'userId': ?0, $or: [ { 'title': { $regex: ?1, $options: 'i' } }, { 'content': { $regex: ?1, $options: 'i' } } ] }")
  Page<Note> searchByUserIdAndQuery(
      @Param("userId") String userId, @Param("query") String query, Pageable pageable);
}
