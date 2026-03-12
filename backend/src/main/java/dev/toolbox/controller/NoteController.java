package dev.toolbox.controller;

import dev.toolbox.models.Note;
import dev.toolbox.models.NoteFolder;
import dev.toolbox.services.NoteService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "*")
public class NoteController {

  @Autowired private NoteService noteService;

  // GET all notes
  @GetMapping
  public Page<Note> getAllNotes(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String folderId,
      @RequestParam(required = false) String tag,
      @RequestParam(required = false) String search) {
    return noteService.getAllNotes(PageRequest.of(page, size), folderId, tag, search);
  }

  // GET one note
  @GetMapping("/{id}")
  public Note getNoteById(@PathVariable String id) {
    return noteService.getNoteById(id).orElse(null);
  }

  // POST create note
  @PostMapping
  public Note createNote(@RequestBody Note note) {
    return noteService.createNote(note);
  }

  // PUT update note
  @PutMapping("/{id}")
  public Note updateNote(@PathVariable String id, @RequestBody Note note) {
    return noteService.updateNote(id, note);
  }

  // DELETE note
  @DeleteMapping("/{id}")
  public void deleteNote(@PathVariable String id) {
    noteService.deleteNote(id);
  }

  // GET all folders
  @GetMapping("/folders")
  public List<NoteFolder> getAllFolders() {
    return noteService.getAllFolders();
  }

  // POST create folder
  @PostMapping("/folders")
  public NoteFolder createFolder(@RequestBody NoteFolder folder) {
    return noteService.createFolder(folder);
  }

  // PUT update folder
  @PutMapping("/folders/{id}")
  public NoteFolder updateFolder(@PathVariable String id, @RequestBody NoteFolder folder) {
    return noteService.updateFolder(id, folder);
  }

  // DELETE folder
  @DeleteMapping("/folders/{id}")
  public void deleteFolder(@PathVariable String id) {
    noteService.deleteFolder(id);
  }
}
