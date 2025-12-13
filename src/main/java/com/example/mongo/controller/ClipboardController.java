package com.example.mongo.controller;

import com.example.mongo.models.ClipboardItem;
import com.example.mongo.services.ClipboardService;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/clipboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ClipboardController {

  private final ClipboardService clipboardService;

  // GET all
  @GetMapping
  public Page<ClipboardItem> getAll(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
    return clipboardService.getAll(PageRequest.of(page, size));
  }

  // GET one
  @GetMapping("/{id}")
  public ClipboardItem getById(@PathVariable String id) {
    return clipboardService.getById(id);
  }

  // JSON CREATE
  @PostMapping
  public ClipboardItem create(@RequestBody ClipboardItem item) {
    return clipboardService.create(item);
  }

  // MULTIPART CREATE  (frontend uses this)
  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ClipboardItem upload(
      @RequestParam(required = false) String content,
      @RequestParam(required = false) MultipartFile media)
      throws IOException {

    ClipboardItem item = new ClipboardItem();
    item.setContent(content);

    if (media != null && !media.isEmpty()) {
      item.setMedia(media.getBytes());
    }

    return clipboardService.create(item);
  }

  // JSON UPDATE
  @PutMapping("/{id}")
  public ClipboardItem update(@PathVariable String id, @RequestBody ClipboardItem item) {
    return clipboardService.update(id, item);
  }

  // MULTIPART UPDATE (frontend uses this)
  @PutMapping(value = "/upload/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ClipboardItem updateUpload(
      @PathVariable String id,
      @RequestParam(required = false) String content,
      @RequestParam(required = false) MultipartFile media)
      throws IOException {

    ClipboardItem existing = clipboardService.getById(id);

    if (content != null) existing.setContent(content);

    if (media != null && !media.isEmpty()) existing.setMedia(media.getBytes());

    return clipboardService.update(id, existing);
  }

  // DELETE
  @DeleteMapping("/{id}")
  public void delete(@PathVariable String id) {
    clipboardService.delete(id);
  }
}
