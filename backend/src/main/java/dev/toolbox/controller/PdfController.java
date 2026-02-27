package dev.toolbox.controller;

import dev.toolbox.models.PdfAnnotation;
import dev.toolbox.models.dto.PdfDocumentDTO;
import dev.toolbox.services.PdfService;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/pdfs")
@CrossOrigin(
    origins = "*",
    exposedHeaders = {
      HttpHeaders.CONTENT_LENGTH,
      HttpHeaders.CONTENT_RANGE,
      HttpHeaders.ACCEPT_RANGES
    })
public class PdfController {

  @Autowired private PdfService pdfService;

  @PostMapping("/upload")
  public PdfDocumentDTO upload(
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "group", required = false) String group)
      throws IOException {
    return pdfService.upload(file, group);
  }

  @GetMapping
  public List<PdfDocumentDTO> listAll() {
    return pdfService.listAll();
  }

  /**
   * Serves the PDF with full HTTP Range support so PDF.js can fetch only the bytes it needs
   * (cross-reference table + individual page streams) rather than downloading the whole file before
   * rendering page 1.
   *
   * <p>Supports: Range: bytes=X-Y → 206 Partial Content (no Range header) → 200 OK (full file, e.g.
   * download button)
   */
  @GetMapping("/{id}/file")
  public ResponseEntity<InputStreamResource> getFile(
      @PathVariable String id,
      @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader)
      throws IOException {

    long fileSize = pdfService.getFileSize(id);

    if (rangeHeader == null) {
      // Full file (download button, or PDF.js fallback)
      InputStream stream = pdfService.getFileStream(id);
      return ResponseEntity.ok()
          .contentType(MediaType.APPLICATION_PDF)
          .header(HttpHeaders.ACCEPT_RANGES, "bytes")
          .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
          .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(fileSize))
          .body(new InputStreamResource(stream));
    }

    // Parse "bytes=X-Y", "bytes=X-", "bytes=-Y"
    long[] range = parseRange(rangeHeader, fileSize);
    long start = range[0];
    long end = range[1];
    long length = end - start + 1;

    InputStream stream = pdfService.getFileStreamRange(id, start, length);
    return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.ACCEPT_RANGES, "bytes")
        .header(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileSize)
        .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(length))
        .body(new InputStreamResource(stream));
  }

  private long[] parseRange(String rangeHeader, long fileSize) {
    // e.g. "bytes=0-65535"
    String spec = rangeHeader.replaceFirst("bytes=", "");
    String[] parts = spec.split("-", 2);
    long start, end;
    if (parts[0].isEmpty()) {
      // suffix range: bytes=-N  →  last N bytes
      long suffix = Long.parseLong(parts[1]);
      start = Math.max(0, fileSize - suffix);
      end = fileSize - 1;
    } else {
      start = Long.parseLong(parts[0]);
      end = (parts.length > 1 && !parts[1].isEmpty()) ? Long.parseLong(parts[1]) : fileSize - 1;
    }
    return new long[] {start, Math.min(end, fileSize - 1)};
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable String id) {
    pdfService.delete(id);
  }

  @PatchMapping("/{id}/progress")
  public PdfDocumentDTO saveProgress(
      @PathVariable String id, @RequestBody Map<String, Integer> body) {
    return pdfService.saveProgress(id, body.get("lastPage"));
  }

  @PatchMapping("/{id}/totalPages")
  public PdfDocumentDTO saveTotalPages(
      @PathVariable String id, @RequestBody Map<String, Integer> body) {
    return pdfService.saveTotalPages(id, body.get("totalPages"));
  }

  @PatchMapping("/{id}/group")
  public PdfDocumentDTO updateGroup(
      @PathVariable String id, @RequestBody Map<String, String> body) {
    return pdfService.updateGroup(id, body.get("group"));
  }

  @GetMapping("/{id}/annotations")
  public List<PdfAnnotation> getAnnotations(@PathVariable String id) {
    return pdfService.getAnnotations(id);
  }

  @PostMapping("/{id}/annotations")
  public PdfAnnotation createAnnotation(
      @PathVariable String id, @RequestBody PdfAnnotation annotation) {
    return pdfService.createAnnotation(id, annotation);
  }

  @DeleteMapping("/{id}/annotations/{aid}")
  public void deleteAnnotation(@PathVariable String id, @PathVariable String aid) {
    pdfService.deleteAnnotation(id, aid);
  }
}
