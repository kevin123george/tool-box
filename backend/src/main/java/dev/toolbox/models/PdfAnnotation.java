package dev.toolbox.models;

import java.time.Instant;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "pdf_annotations")
@CompoundIndex(name = "pdf_user_page_idx", def = "{'pdfId': 1, 'userId': 1, 'page': 1}")
public class PdfAnnotation {

  @Id private String id;

  @Indexed private String pdfId;

  @Indexed private String userId;

  private AnnotationType type;
  private int page;

  // Highlight fields
  private String color; // yellow / green / pink
  private String selectedText;
  private List<Rect> rects;

  // Note fields
  private String text;
  private Double noteX; // normalized 0-1
  private Double noteY; // normalized 0-1

  // Freehand pen fields
  private List<List<Point>> strokes; // each stroke = list of normalized points
  private Double strokeWidth; // normalized fraction of page width (e.g. 0.003)

  @CreatedDate private Instant createdAt;

  public enum AnnotationType {
    HIGHLIGHT,
    NOTE,
    FREEHAND,
    BOOKMARK
  }

  @Data
  @NoArgsConstructor
  public static class Rect {
    private double x;
    private double y;
    private double width;
    private double height;
  }

  @Data
  @NoArgsConstructor
  public static class Point {
    private double x;
    private double y;
  }
}
