package com.finsight.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.finsight.dto.DashboardResponse;
import com.finsight.dto.TransactionResponse;
import com.finsight.entity.Account;
import com.finsight.entity.FinanceTransaction;
import com.finsight.entity.TransactionType;
import com.finsight.entity.User;
import com.finsight.exception.ResourceNotFoundException;
import com.finsight.repository.AccountRepository;
import com.finsight.repository.TransactionRepository;
import com.finsight.repository.UserRepository;

@Service
public class DashboardService {
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final FinancialMathService financialMathService;

    public DashboardService(TransactionRepository transactionRepository, UserRepository userRepository,
                            AccountRepository accountRepository, FinancialMathService financialMathService) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.financialMathService = financialMathService;
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        BigDecimal totalIncome = value(transactionRepository.sumByType(user.getId(), TransactionType.INCOME));
        BigDecimal totalExpenses = value(transactionRepository.sumByType(user.getId(), TransactionType.EXPENSE));
        BigDecimal monthlyIncome = value(transactionRepository.sumByTypeBetween(user.getId(), TransactionType.INCOME, monthStart, today));
        BigDecimal monthlyExpenses = value(transactionRepository.sumByTypeBetween(user.getId(), TransactionType.EXPENSE, monthStart, today));
        BigDecimal netCashFlow = financialMathService.calculateNetCashFlow(totalIncome, totalExpenses);
        BigDecimal currentBalance = calculateCurrentBalance(user);
        BigDecimal savingsRate = financialMathService.calculateSavingsRate(totalIncome, totalExpenses);

        LinkedHashMap<String, BigDecimal> categorySpending = new LinkedHashMap<>();
        transactionRepository.sumByCategoryBetween(user.getId(), TransactionType.EXPENSE, monthStart, today)
                .forEach(row -> categorySpending.put((String) row[0], value((BigDecimal) row[1])));

        Map<String, BigDecimal> monthlySpending = buildMonthlySpending(user.getId());
        List<TransactionResponse> recentTransactions = transactionRepository.findByUserIdOrderByTransactionDateDescCreatedAtDesc(user.getId(), PageRequest.of(0, 8))
                .map(TransactionResponse::from).getContent();
        List<String> insights = buildInsights(categorySpending, monthlyExpenses, savingsRate);

        return new DashboardResponse(
                currentBalance,
                totalIncome,
                totalExpenses,
                monthlyIncome,
                monthlyExpenses,
                netCashFlow,
                savingsRate,
                categorySpending,
                monthlySpending,
                recentTransactions,
                insights);
    }

    private BigDecimal calculateCurrentBalance(User user) {
        BigDecimal totalBalance = BigDecimal.ZERO;
        List<Account> accounts = accountRepository.findByUserIdAndActiveTrueOrderByName(user.getId());
        List<FinanceTransaction> transactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId());

        for (Account account : accounts) {
            BigDecimal balance = value(account.getOpeningBalance());
            for (FinanceTransaction transaction : transactions) {
                if (transaction.getAccount() != null && transaction.getAccount().getId().equals(account.getId())) {
                    if (transaction.getType() == TransactionType.INCOME) {
                        balance = balance.add(value(transaction.getAmount()));
                    } else if (transaction.getType() == TransactionType.EXPENSE) {
                        balance = balance.subtract(value(transaction.getAmount()));
                    }
                }

                if (transaction.getType() == TransactionType.TRANSFER) {
                    if (transaction.getSourceAccount() != null && transaction.getSourceAccount().getId().equals(account.getId())) {
                        balance = balance.subtract(value(transaction.getAmount()));
                    }
                    if (transaction.getTargetAccount() != null && transaction.getTargetAccount().getId().equals(account.getId())) {
                        balance = balance.add(value(transaction.getAmount()));
                    }
                }
            }
            totalBalance = totalBalance.add(balance);
        }

        return totalBalance;
    }

    private Map<String, BigDecimal> buildMonthlySpending(Long userId) {
        LocalDate today = LocalDate.now();
        LinkedHashMap<String, BigDecimal> monthlySpending = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM", Locale.ENGLISH);

        for (int i = 5; i >= 0; i--) {
            LocalDate monthDate = today.minusMonths(i).withDayOfMonth(1);
            String label = monthDate.format(formatter);
            LocalDate monthEnd = monthDate.withDayOfMonth(monthDate.lengthOfMonth());
            BigDecimal amount = value(transactionRepository.sumByTypeBetween(userId, TransactionType.EXPENSE, monthDate, monthEnd));
            monthlySpending.put(label, amount);
        }

        return monthlySpending;
    }

    private List<String> buildInsights(Map<String, BigDecimal> categorySpending, BigDecimal expenses, BigDecimal savingsRate) {
        if (categorySpending.isEmpty()) {
            return List.of("Add a few transactions to start generating cash-flow insights.");
        }

        var entry = categorySpending.entrySet().iterator().next();
        String topCategory = entry.getKey();
        BigDecimal topAmount = value(entry.getValue());
        BigDecimal share = expenses.signum() == 0 ? BigDecimal.ZERO : topAmount.multiply(BigDecimal.valueOf(100)).divide(expenses, 0, RoundingMode.HALF_UP);

        return List.of(
                "Your highest spending category this month is " + topCategory + ".",
                topCategory + " represents " + share + "% of this month's expenses.",
                "Your current savings rate is " + savingsRate + "%.");
    }

    private BigDecimal value(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }
}