package com.example.mongo.services;

import com.example.mongo.repos.MemoRepository;
import com.example.mongo.models.Memo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MemoService {

    @Autowired
    private MemoRepository memoRepository;

    public List<Memo> getAllMemos() {
        return memoRepository.findAll();
    }

    public Optional<Memo> getMemoById(String id) {
        return memoRepository.findById(id);
    }

    public Memo createMemo(Memo memo) {
        return memoRepository.save(memo);
    }

    public Memo updateMemo(String id, Memo memoDetails) {
        return memoRepository.findById(id).map(memo -> {
            memo.setTitle(memoDetails.getTitle());
            memo.setContent(memoDetails.getContent());
            memo.setPinned(memoDetails.isPinned());
            memo.setCategory(memoDetails.getCategory());
            return memoRepository.save(memo);
        }).orElse(null);
    }

    public void deleteMemo(String id) {
        memoRepository.deleteById(id);
    }
}
