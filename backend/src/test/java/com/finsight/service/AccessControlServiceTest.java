package com.finsight.service;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.finsight.dto.AccountRequest;
import com.finsight.dto.LoginRequest;
import com.finsight.dto.RegisterRequest;
import com.finsight.entity.AccountType;
import com.finsight.entity.User;
import com.finsight.exception.ResourceNotFoundException;
import com.finsight.repository.AccountRepository;
import com.finsight.repository.UserRepository;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AccessControlServiceTest {

    @Autowired private AuthService authService;
    @Autowired private AccountService accountService;
    @Autowired private UserRepository userRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void validLoginGeneratesToken() {
        RegisterRequest request = new RegisterRequest();
        request.setName("Alice");
        request.setEmail("alice@example.com");
        request.setPassword("secret123");
        authService.registerUser(request);

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("alice@example.com");
        loginRequest.setPwd("secret123");

        String token = authService.loginUser(loginRequest);

        assertTrue(token.contains("."));
        assertEquals(3, token.split("\\.").length);
    }

    @Test
    void invalidLoginThrowsError() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("missing@example.com");
        loginRequest.setPwd("wrongpass");

        assertThrows(IllegalArgumentException.class, () -> authService.loginUser(loginRequest));
    }

    @Test
    void userCannotAccessAnotherUsersAccount() {
        User userA = new User("Alice", "alice@example.com", passwordEncoder.encode("secret123"));
        User userB = new User("Bob", "bob@example.com", passwordEncoder.encode("secret123"));
        userRepository.save(userA);
        userRepository.save(userB);

        AccountRequest request = new AccountRequest("Shared", AccountType.BANK, "INR", new BigDecimal("2500.00"), true);
        var accountA = accountService.create("alice@example.com", request);

        AccountRequest otherUsersRequest = new AccountRequest("Other", AccountType.CASH, "INR", new BigDecimal("500.00"), true);
        var accountB = accountService.create("bob@example.com", otherUsersRequest);

        assertEquals(1, accountRepository.findByUserOrderByName(userA).size());
        assertEquals(1, accountRepository.findByUserOrderByName(userB).size());
        assertThrows(ResourceNotFoundException.class,
                () -> accountService.findById("bob@example.com", accountA.id()));
        assertThrows(ResourceNotFoundException.class,
                () -> accountService.update("alice@example.com", accountB.id(), request));
        assertThrows(ResourceNotFoundException.class,
                () -> accountService.delete("alice@example.com", accountB.id()));
    }
}
