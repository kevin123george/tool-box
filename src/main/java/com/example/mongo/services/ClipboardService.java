package com.example.mongo.services;


import com.example.mongo.models.ClipboardItem;
import com.example.mongo.repos.ClipboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClipboardService {

    private final ClipboardRepository clipboardRepository;

    public List<ClipboardItem> getAll() {
        return clipboardRepository.findAll();
    }

    public ClipboardItem getById(String id) {
        return clipboardRepository.findById(id).orElse(null);
    }

    public ClipboardItem create(ClipboardItem item) {
        return clipboardRepository.save(item);
    }

    public ClipboardItem update(String id, ClipboardItem item) {
        return clipboardRepository.findById(id)
                .map(existing -> {
                    existing.setContent(item.getContent());
                    return clipboardRepository.save(existing);
                })
                .orElse(null);
    }

    public void delete(String id) {
        clipboardRepository.deleteById(id);
    }
}
