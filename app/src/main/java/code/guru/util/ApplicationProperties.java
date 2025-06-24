package code.guru.util;

public enum ApplicationProperties {

    REPO_PATH,
    JDTLS_HOME,
    FILE_PATH;

    public static String toPropertyKey(ApplicationProperties prop) {
        return prop.name()
                .toLowerCase()
                .replace('_', '.');
    }
}
