package com.coin.util;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Evaluates the arithmetic a user can type straight into the entry box, e.g.
 * "100+50*2" or "(100+50)*2". Standard operator precedence applies.
 *
 * <p>Hand-written recursive descent on purpose: Paise never runs the user's
 * text as code, so there is no script engine, no eval and no reflection here.
 */
public final class ArithmeticEvaluator {

    /** Wide enough for money maths without losing precision on chained steps. */
    private static final MathContext MATH_CONTEXT = new MathContext(16, RoundingMode.HALF_UP);

    private final String source;
    private int position;

    private ArithmeticEvaluator(String source) {
        this.source = source;
    }

    public static BigDecimal evaluate(String expression) {
        if (expression == null || expression.isBlank()) {
            throw new IllegalArgumentException("There is no calculation to work out");
        }

        ArithmeticEvaluator evaluator = new ArithmeticEvaluator(expression);
        BigDecimal value = evaluator.readExpression();
        evaluator.skipSpaces();

        if (!evaluator.atEnd()) {
            throw new IllegalArgumentException(
                    "There is an unexpected character in that calculation: '" + evaluator.source.charAt(evaluator.position) + "'");
        }
        return value;
    }

    private BigDecimal readExpression() {
        BigDecimal value = readTerm();
        while (true) {
            skipSpaces();
            if (consume('+')) {
                value = value.add(readTerm(), MATH_CONTEXT);
            } else if (consume('-')) {
                value = value.subtract(readTerm(), MATH_CONTEXT);
            } else {
                return value;
            }
        }
    }

    private BigDecimal readTerm() {
        BigDecimal value = readFactor();
        while (true) {
            skipSpaces();
            if (consume('*')) {
                value = value.multiply(readFactor(), MATH_CONTEXT);
            } else if (consume('/')) {
                BigDecimal divisor = readFactor();
                if (divisor.compareTo(BigDecimal.ZERO) == 0) {
                    throw new IllegalArgumentException("That calculation divides by zero");
                }
                value = value.divide(divisor, MATH_CONTEXT);
            } else {
                return value;
            }
        }
    }

    private BigDecimal readFactor() {
        skipSpaces();
        if (consume('-')) {
            return readFactor().negate();
        }
        if (consume('+')) {
            return readFactor();
        }
        return readPrimary();
    }

    private BigDecimal readPrimary() {
        skipSpaces();
        if (consume('(')) {
            BigDecimal value = readExpression();
            skipSpaces();
            if (!consume(')')) {
                throw new IllegalArgumentException("That calculation is missing a closing bracket");
            }
            return value;
        }
        return readNumber();
    }

    private BigDecimal readNumber() {
        skipSpaces();
        int start = position;
        while (!atEnd() && (Character.isDigit(source.charAt(position)) || source.charAt(position) == '.')) {
            position++;
        }
        if (start == position) {
            throw new IllegalArgumentException("That calculation is not valid");
        }

        String text = source.substring(start, position);
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("That calculation is not valid");
        }
    }

    private boolean consume(char expected) {
        if (!atEnd() && source.charAt(position) == expected) {
            position++;
            return true;
        }
        return false;
    }

    private void skipSpaces() {
        while (!atEnd() && Character.isWhitespace(source.charAt(position))) {
            position++;
        }
    }

    private boolean atEnd() {
        return position >= source.length();
    }
}
