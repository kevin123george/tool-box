package com.example.mongo.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@Document(collection = "memos")
public class Memo {

    @Id
    private String id;

    private String title;       // Required
    private String content;     // Rich text content
    private boolean pinned = false;
    private Category category = Category.personal;

    @Field("media")
    private byte[] media;       // <-- Simple blob attachment (optional)

    public enum Category {
        personal,
        work,
        ideas,
        journal
    }

    public Memo() {}

    public Memo(String title, String content, boolean pinned, Category category, byte[] media) {
        this.title = title;
        this.content = content;
        this.pinned = pinned;
        this.category = category;
        this.media = media;
    }
}
