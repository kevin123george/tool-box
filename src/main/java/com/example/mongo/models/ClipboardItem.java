package com.example.mongo.models;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "clipboard_items")
public class ClipboardItem {

    @Id
    private String id;

    private String content; // required text content

    @Field("media")
    private byte[] media;   // optional simple blob attachment
}
