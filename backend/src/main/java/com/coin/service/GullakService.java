package com.coin.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.coin.dto.GullakSummaryResponse;
import com.coin.dto.SavingsRequest;
import com.coin.dto.SavingsTransactionResponse;
import com.coin.entity.SavingsTransaction;
import com.coin.entity.SavingsType;
import com.coin.entity.User;
import com.coin.exception.ApiException;
import com.coin.repository.SavingsTransactionRepository;
import com.coin.repository.UserRepository;

/**
 * The Gullak is a small personal savings ledger. Every deposit and withdrawal is
 * a row; the balance is always computed from those rows and never stored, which
 * keeps the numbers honest even after edits or deletes.
 *
 * <p>Writes take a row lock on the account first ({@code findByIdForUpdate}) so
 * two withdrawals can never spend the same balance at the same time.
 */
@Service
public class GullakService {

    private final SavingsTransactionRepository savingsRepository;
    private final UserRepository userRepository;

    public GullakService(SavingsTransactionRepository savingsRepository, UserRepository userRepository) {
        this.savingsRepository = savingsRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public GullakSummaryResponse summary(User user) {
        BigDecimal deposits = scale(savingsRepository.sumAmountByUserAndType(user, SavingsType.DEPOSIT));
        BigDecimal withdrawals = scale(savingsRepository.sumAmountByUserAndType(user, SavingsType.WITHDRAWAL));

        return new GullakSummaryResponse(
                deposits.subtract(withdrawals),
                deposits,
                withdrawals,
                savingsRepository.countByUser(user));
    }

    @Transactional(readOnly = true)
    public List<SavingsTransactionResponse> list(User user, String type, String sort, String direction) {
        SavingsType filter = null;
        if (type != null && !type.isBlank()) {
            filter = parseFilter(type);
        }

        List<SavingsTransaction> rows = savingsRepository.findByUserOrderByDateDescCreatedAtDesc(user);

        if (filter != null) {
            SavingsType wanted = filter;
            rows = rows.stream().filter(row -> row.getType() == wanted).toList();
        }

        // Default is date descending; amount sort is opt-in via the query string.
        boolean byAmount = "amount".equalsIgnoreCase(sort == null ? "" : sort.trim());
        boolean ascending = "asc".equalsIgnoreCase(direction == null ? "" : direction.trim());

        Comparator<SavingsTransaction> comparator = byAmount
                ? Comparator.comparing(SavingsTransaction::getAmount)
                : Comparator.comparing(SavingsTransaction::getDate)
                        .thenComparing(SavingsTransaction::getCreatedAt);

        return rows.stream()
                .sorted(ascending ? comparator : comparator.reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SavingsTransactionResponse create(User user, SavingsRequest request) {
        // Lock the account so the balance we read below cannot change underneath us.
        userRepository.findByIdForUpdate(user.getId());

        SavingsType type = parseType(request.type());

        if (type == SavingsType.WITHDRAWAL) {
            BigDecimal balance = balanceOf(user);
            if (request.amount().compareTo(balance) > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "You only have ₹" + balance.toPlainString() + " in your gullak");
            }
        }

        SavingsTransaction row = new SavingsTransaction();
        row.setUser(user);
        row.setAmount(scale(request.amount()));
        row.setType(type);
        row.setNote(normaliseNote(request.note()));
        row.setDate(request.date() == null ? LocalDate.now() : request.date());

        return toResponse(savingsRepository.save(row));
    }

    @Transactional
    public SavingsTransactionResponse update(User user, Long id, SavingsRequest request) {
        userRepository.findByIdForUpdate(user.getId());

        SavingsTransaction row = savingsRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That gullak entry no longer exists"));

        SavingsType type = parseType(request.type());

        // Work out the balance as if this row did not exist, so its old value
        // never unfairly blocks (or allows) the new one.
        BigDecimal rest = balanceOf(user).subtract(contributionOf(row));
        BigDecimal resulting = type == SavingsType.WITHDRAWAL
                ? rest.subtract(scale(request.amount()))
                : rest.add(scale(request.amount()));

        if (resulting.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You only have ₹" + rest.toPlainString() + " in your gullak");
        }

        row.setAmount(scale(request.amount()));
        row.setType(type);
        row.setNote(normaliseNote(request.note()));
        row.setDate(request.date() == null ? LocalDate.now() : request.date());

        return toResponse(savingsRepository.save(row));
    }

    @Transactional
    public void delete(User user, Long id) {
        userRepository.findByIdForUpdate(user.getId());

        SavingsTransaction row = savingsRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That gullak entry no longer exists"));

        savingsRepository.delete(row);
    }

    /** Deposits minus withdrawals: the ledger is the single source of truth. */
    private BigDecimal balanceOf(User user) {
        BigDecimal deposits = savingsRepository.sumAmountByUserAndType(user, SavingsType.DEPOSIT);
        BigDecimal withdrawals = savingsRepository.sumAmountByUserAndType(user, SavingsType.WITHDRAWAL);
        return scale(deposits).subtract(scale(withdrawals));
    }

    /** What this row currently adds to (or removes from) the balance. */
    private BigDecimal contributionOf(SavingsTransaction row) {
        BigDecimal amount = scale(row.getAmount());
        return row.getType() == SavingsType.DEPOSIT ? amount : amount.negate();
    }

    /** Accepts "deposit"/"DEPOSIT"/" withdrawal " but nothing else. */
    private SavingsType parseType(String raw) {
        if (raw != null) {
            String value = raw.trim().toUpperCase();
            if ("DEPOSIT".equals(value)) {
                return SavingsType.DEPOSIT;
            }
            if ("WITHDRAWAL".equals(value)) {
                return SavingsType.WITHDRAWAL;
            }
        }
        throw new IllegalArgumentException("Choose deposit or withdrawal");
    }

    /** Same parsing rules as {@link #parseType} but for the list filter. */
    private SavingsType parseFilter(String raw) {
        String value = raw.trim().toUpperCase();
        if ("DEPOSIT".equals(value)) {
            return SavingsType.DEPOSIT;
        }
        if ("WITHDRAWAL".equals(value)) {
            return SavingsType.WITHDRAWAL;
        }
        throw new IllegalArgumentException("Unknown transaction type: " + raw);
    }

    private SavingsTransactionResponse toResponse(SavingsTransaction row) {
        return new SavingsTransactionResponse(
                row.getId(),
                row.getAmount(),
                row.getType().name(),
                row.getNote(),
                row.getDate(),
                row.getCreatedAt());
    }

    private static String normaliseNote(String note) {
        return note == null || note.isBlank() ? null : note.trim();
    }

    private static BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
