package com.example.mongo.models;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "bank_accounts")
public class BankAccount {

    @Id
    private String id;

//    @Id
    private String bank;        // Bank name (N26, Sparkasse, etc.)
    private double balance;     // Current amount of money
    private String currency = "EUR"; // Default EUR
    private String mode = "Current";

    @LastModifiedDate
    private Instant lastModified;

    @CreatedDate
    private Instant createdAt;

    public BankAccount() {}

    public BankAccount(String name, double balance, String currency,  String mode) {
        this.bank = name;
        this.balance = balance;
        this.currency = currency;
        this.mode = mode;
    }
}
