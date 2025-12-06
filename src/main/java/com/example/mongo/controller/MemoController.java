package com.example.mongo.controller;

import com.example.mongo.services.MemoService;
import com.example.mongo.models.Memo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/memos")
@CrossOrigin(origins = "*") // Remove or adjust for production
public class MemoController {

    @Autowired
    private MemoService memoService;

    // GET all
    @GetMapping
    public List<Memo> getAllMemos() {
        return memoService.getAllMemos();
    }

    // GET one
    @GetMapping("/{id}")
    public Memo getMemo(@PathVariable String id) {
        return memoService.getMemoById(id).orElse(null);
    }

    // POST create
    @PostMapping
    public Memo createMemo(@RequestBody Memo memo) {
        return memoService.createMemo(memo);
    }

    // PUT update
    @PutMapping("/{id}")
    public Memo updateMemo(@PathVariable String id, @RequestBody Memo memo) {
        return memoService.updateMemo(id, memo);
    }

    // DELETE remove
    @DeleteMapping("/{id}")
    public void deleteMemo(@PathVariable String id) {
        memoService.deleteMemo(id);
    }


    @PostMapping("/upload")
    public Memo uploadMemo(
            @RequestParam String title,
            @RequestParam(required = false) String content,
            @RequestParam(defaultValue = "personal") Memo.Category category,
            @RequestParam(defaultValue = "false") boolean pinned,
            @RequestParam(required = false) MultipartFile media
    ) throws IOException {

        Memo memo = new Memo();
        memo.setTitle(title);
        memo.setContent(content);
        memo.setCategory(category);
        memo.setPinned(pinned);

        if (media != null && !media.isEmpty()) {
            memo.setMedia(media.getBytes());
        }

        return memoService.createMemo(memo);
    }



    @PutMapping(value = "/upload/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Memo updateMemoMultipart(
            @PathVariable String id,
            @RequestParam String title,
            @RequestParam(required = false) String content,
            @RequestParam Memo.Category category,
            @RequestParam boolean pinned,
            @RequestParam(required = false) MultipartFile media
    ) throws IOException {

        Memo existing = memoService.getMemoById(id).orElseThrow();

        existing.setTitle(title);
        existing.setContent(content);
        existing.setCategory(category);
        existing.setPinned(pinned);

        if (media != null && !media.isEmpty()) {
            existing.setMedia(media.getBytes());
        }

        return memoService.updateMemo(id, existing);
    }

}
