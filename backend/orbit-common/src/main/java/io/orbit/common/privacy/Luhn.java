package io.orbit.common.privacy;

/** Luhn (mod 10) check used to recognize card numbers. */
public final class Luhn {

    private Luhn() {
    }

    /** True for 13 to 19 digits whose Luhn checksum is valid. */
    public static boolean isValid(String digits) {
        int length = digits.length();
        if (length < 13 || length > 19 || !digits.chars().allMatch(Character::isDigit)) {
            return false;
        }
        int sum = 0;
        boolean doubleIt = false;
        for (int i = length - 1; i >= 0; i--) {
            int d = digits.charAt(i) - '0';
            if (doubleIt) {
                d *= 2;
                if (d > 9) {
                    d -= 9;
                }
            }
            sum += d;
            doubleIt = !doubleIt;
        }
        return sum % 10 == 0;
    }
}
