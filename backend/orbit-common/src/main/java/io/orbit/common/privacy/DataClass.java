package io.orbit.common.privacy;

/** Sensitivity classes from docs/04-data-protection.md, section 1. */
public enum DataClass {
    PCI_PAN,
    PCI_SAD,
    PERSONAL,
    SECRET,
    NONE
}
