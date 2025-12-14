package com.example.mongo.services;

import com.example.mongo.models.Memo;
import com.example.mongo.repos.MemoRepository;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class MemoService {

  @Autowired private MemoRepository memoRepository;

  public Page<Memo> getAllMemos(Pageable pageable) {

    Pageable sortedPageable =
        PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(
                Sort.Order.desc("pinned"),
                Sort.Order.desc("updatedAt"),
                Sort.Order.desc("createdAt")));

    return memoRepository.findAll(sortedPageable);
  }

  public Optional<Memo> getMemoById(String id) {
    return memoRepository.findById(id);
  }

  public Memo createMemo(Memo memo) {
    return memoRepository.save(memo);
  }

  public Memo updateMemo(String id, Memo memoDetails) {
    return memoRepository
        .findById(id)
        .map(
            memo -> {
              memo.setTitle(memoDetails.getTitle());
              memo.setContent(memoDetails.getContent());
              memo.setPinned(memoDetails.isPinned());
              memo.setCategory(memoDetails.getCategory());
              return memoRepository.save(memo);
            })
        .orElse(null);
  }

  public void deleteAllMemos() {
    memoRepository.deleteAll();
  }

  public void deleteMemo(String id) {
    memoRepository.deleteById(id);
  }
}
