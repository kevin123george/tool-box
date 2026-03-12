package dev.toolbox.models;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "note_folders")
public class NoteFolder {

  @Id private String id;

  @Indexed private String userId;

  private String name;
  private String parentId;

  @CreatedDate private Instant createdAt;

  public NoteFolder() {}
}
