package dev.toolbox.services;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.Note;
import dev.toolbox.models.NoteFolder;
import dev.toolbox.repos.NoteFolderRepository;
import dev.toolbox.repos.NoteRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class NoteService {

  @Autowired private NoteRepository noteRepository;
  @Autowired private NoteFolderRepository noteFolderRepository;
  @Autowired private AuthUtils authUtils;

  public Page<Note> getAllNotes(Pageable pageable, String folderId, String tag, String search) {
    String userId = authUtils.getCurrentUserId();
    Pageable sortedPageable =
        PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(Sort.Order.desc("updatedAt")));

    if (search != null && !search.isBlank()) {
      return noteRepository.searchByUserIdAndQuery(userId, search, sortedPageable);
    }
    if (tag != null && !tag.isBlank()) {
      return noteRepository.findAllByUserIdAndTagsContaining(userId, tag, sortedPageable);
    }
    if (folderId != null && !folderId.isBlank()) {
      return noteRepository.findAllByUserIdAndFolderId(userId, folderId, sortedPageable);
    }
    return noteRepository.findAllByUserId(userId, sortedPageable);
  }

  public Optional<Note> getNoteById(String id) {
    String userId = authUtils.getCurrentUserId();
    return noteRepository.findById(id).filter(note -> userId.equals(note.getUserId()));
  }

  public Note createNote(Note note) {
    note.setUserId(authUtils.getCurrentUserId());
    if (note.getTags() == null) {
      note.setTags(new java.util.ArrayList<>());
    }
    return noteRepository.save(note);
  }

  public Note updateNote(String id, Note details) {
    String userId = authUtils.getCurrentUserId();
    return noteRepository
        .findById(id)
        .filter(note -> userId.equals(note.getUserId()))
        .map(
            note -> {
              note.setTitle(details.getTitle());
              note.setContent(details.getContent());
              note.setFolderId(details.getFolderId());
              if (details.getTags() != null) {
                note.setTags(details.getTags());
              }
              return noteRepository.save(note);
            })
        .orElse(null);
  }

  public void deleteNote(String id) {
    String userId = authUtils.getCurrentUserId();
    noteRepository
        .findById(id)
        .ifPresent(
            note -> {
              if (userId.equals(note.getUserId())) noteRepository.deleteById(id);
            });
  }

  public List<NoteFolder> getAllFolders() {
    String userId = authUtils.getCurrentUserId();
    return noteFolderRepository.findAllByUserId(userId);
  }

  public NoteFolder createFolder(NoteFolder folder) {
    folder.setUserId(authUtils.getCurrentUserId());
    return noteFolderRepository.save(folder);
  }

  public NoteFolder updateFolder(String id, NoteFolder details) {
    String userId = authUtils.getCurrentUserId();
    return noteFolderRepository
        .findById(id)
        .filter(folder -> userId.equals(folder.getUserId()))
        .map(
            folder -> {
              folder.setName(details.getName());
              folder.setParentId(details.getParentId());
              return noteFolderRepository.save(folder);
            })
        .orElse(null);
  }

  public void deleteFolder(String id) {
    String userId = authUtils.getCurrentUserId();
    noteFolderRepository
        .findById(id)
        .ifPresent(
            folder -> {
              if (userId.equals(folder.getUserId())) {
                // Unlink all notes in this folder
                List<Note> notesInFolder = noteRepository.findAllByUserIdAndFolderId(userId, id);
                notesInFolder.forEach(
                    note -> {
                      note.setFolderId(null);
                      noteRepository.save(note);
                    });
                noteFolderRepository.deleteById(id);
              }
            });
  }
}
