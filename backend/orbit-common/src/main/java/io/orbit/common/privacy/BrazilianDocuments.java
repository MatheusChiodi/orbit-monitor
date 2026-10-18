package io.orbit.common.privacy;

/** Check-digit validation for CPF (11 digits) and CNPJ (14 digits). */
final class BrazilianDocuments {

    private static final int[] CNPJ_WEIGHTS_1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    private static final int[] CNPJ_WEIGHTS_2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

    private BrazilianDocuments() {
    }

    static boolean isCpf(String digits) {
        if (digits.length() != 11 || allSame(digits)) {
            return false;
        }
        return cpfDigit(digits, 9) == digits.charAt(9) - '0' && cpfDigit(digits, 10) == digits.charAt(10) - '0';
    }

    static boolean isCnpj(String digits) {
        if (digits.length() != 14 || allSame(digits)) {
            return false;
        }
        return cnpjDigit(digits, CNPJ_WEIGHTS_1) == digits.charAt(12) - '0'
                && cnpjDigit(digits, CNPJ_WEIGHTS_2) == digits.charAt(13) - '0';
    }

    private static int cpfDigit(String digits, int count) {
        int sum = 0;
        for (int i = 0; i < count; i++) {
            sum += (digits.charAt(i) - '0') * (count + 1 - i);
        }
        int r = (sum * 10) % 11;
        return r == 10 ? 0 : r;
    }

    private static int cnpjDigit(String digits, int[] weights) {
        int sum = 0;
        for (int i = 0; i < weights.length; i++) {
            sum += (digits.charAt(i) - '0') * weights[i];
        }
        int r = sum % 11;
        return r < 2 ? 0 : 11 - r;
    }

    private static boolean allSame(String digits) {
        return digits.chars().distinct().count() == 1;
    }
}
