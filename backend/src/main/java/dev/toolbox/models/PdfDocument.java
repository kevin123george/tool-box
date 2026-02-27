package dev.toolbox.models;

import java.time.Instant;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "pdf_documents")
public class PdfDocument {

  @Id private String id;

  @Indexed private String userId;

  private String filename;
  private long fileSize;
  private int totalPages;
  private String gridFsFileId;
  private String group;
  private int lastPage = 1;
  private Instant lastReadAt;

  @CreatedDate private Instant createdAt;

  @LastModifiedDate private Instant updatedAt;
}
