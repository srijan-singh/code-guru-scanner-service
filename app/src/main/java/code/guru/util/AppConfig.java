/* code-guru-scanner-service
 * Copyright (C) 2025 Srijan Singh
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details:
 *     https://www.gnu.org/licenses/gpl-3.0.txt
 */
package code.guru.util;

import lombok.extern.slf4j.Slf4j;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

@Slf4j
public class AppConfig {

    private static final String APPLICATION_PROPERTIES = "/Users/srijansingh/Desktop/mcp/scanner-service/app/src/main/resources/application.properties";

    private final Properties properties = new Properties();

    public AppConfig() throws IOException {
        try (FileInputStream in = new FileInputStream(APPLICATION_PROPERTIES)) {
            properties.load(in);
        }
    }

    private String get(String key) {
        return properties.getProperty(key);
    }

    public String getOrThrow(ApplicationProperties applicationProperties) {
        String propertyKey = ApplicationProperties.toPropertyKey(applicationProperties);
        String value = get(propertyKey);
        if (value == null) {
            log.error("Missing property {} in {}", propertyKey, APPLICATION_PROPERTIES);
            throw new IllegalArgumentException("Missing property: " + propertyKey);
        }
        return value;
    }
}

