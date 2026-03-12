package dev.toolbox.models;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "notes")
public class Note {

  @Id private String id;

  @Indexed private String userId;

  private String title;
  private String content;
  private String folderId;
  private List<String> tags = new ArrayList<>();

  @CreatedDate private Instant createdAt;

  @LastModifiedDate private Instant updatedAt;

  public Note() {}
}
