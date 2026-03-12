package dev.toolbox.repos;

import dev.toolbox.models.NoteFolder;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NoteFolderRepository extends MongoRepository<NoteFolder, String> {

  List<NoteFolder> findAllByUserId(String userId);

  List<NoteFolder> findAllByUserIdAndParentId(String userId, String parentId);
}
