package dev.toolbox.services;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.Memo;
import dev.toolbox.repos.MemoRepository;
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
  @Autowired private AuthUtils authUtils;

  public Page<Memo> getAllMemos(Pageable pageable, Memo.Category category) {
    String userId = authUtils.getCurrentUserId();
    Pageable sortedPageable =
        PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(
                Sort.Order.desc("pinned"),
                Sort.Order.desc("updatedAt"),
                Sort.Order.desc("createdAt")));
    if (category != null) {
      return memoRepository.findAllByUserIdAndCategory(userId, category, sortedPageable);
    }
    return memoRepository.findAllByUserId(userId, sortedPageable);
  }

  public Optional<Memo> getMemoById(String id) {
    String userId = authUtils.getCurrentUserId();
    return memoRepository.findById(id).filter(memo -> userId.equals(memo.getUserId()));
  }

  public Memo createMemo(Memo memo) {
    memo.setUserId(authUtils.getCurrentUserId());
    return memoRepository.save(memo);
  }

  public Memo updateMemo(String id, Memo memoDetails) {
    String userId = authUtils.getCurrentUserId();
    return memoRepository
        .findById(id)
        .filter(memo -> userId.equals(memo.getUserId()))
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
    String userId = authUtils.getCurrentUserId();
    memoRepository.deleteAll(memoRepository.findAllByUserId(userId));
  }

  public void deleteMemo(String id) {
    String userId = authUtils.getCurrentUserId();
    memoRepository
        .findById(id)
        .ifPresent(
            memo -> {
              if (userId.equals(memo.getUserId())) memoRepository.deleteById(id);
            });
  }
}
