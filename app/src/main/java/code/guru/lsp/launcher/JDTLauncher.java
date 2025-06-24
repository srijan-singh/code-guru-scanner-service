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
package code.guru.lsp.launcher;

import code.guru.util.ApplicationProperties;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Slf4j
@NoArgsConstructor
public class JDTLauncher {

    public static Process startJDTLanguageServer(File workspace, String jdtLsHome) throws IOException {
        // Replace these with your actual path to JDT LS
        File pluginsDir = new File(jdtLsHome, "plugins");

        File launcherJar = findLauncherJar(pluginsDir);
        if (launcherJar == null) {
            log.error("Cannot find JDT LS launcher JAR in: {}", pluginsDir.getAbsolutePath());
            throw new IOException("Cannot find JDT LS launcher JAR in: " + pluginsDir.getAbsolutePath());
        }

        File configDir = new File(jdtLsHome, "config_" + getPlatform());
        if (!configDir.exists()) {
            log.error("Cannot find config dir: {}", configDir.getAbsolutePath());
            throw new IOException("Cannot find config dir: " + configDir.getAbsolutePath());
        }

        List<String> command = Arrays.asList(
                "java",
                "-Declipse.application=org.eclipse.jdt.ls.core.mavenApplication", // maven project
                "-Declipse.application=org.eclipse.jdt.ls.core.id1",
                "-Dosgi.bundles.defaultStartLevel=4",
                "-Declipse.product=org.eclipse.jdt.ls.core.product",
                "-noverify",
                "-Xmx1G",
                "-jar", launcherJar.getAbsolutePath(),
                "-configuration", configDir.getAbsolutePath(),
                "-data", workspace.getAbsolutePath()
        );

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);

        log.info("Starting JDT LS with command:");
        command.forEach(log::info);

        return pb.start();
    }

    private static File findLauncherJar(File pluginsDir) {
        if (!pluginsDir.exists() || !pluginsDir.isDirectory()) return null;

        File[] files = pluginsDir.listFiles((dir, name) -> name.startsWith("org.eclipse.equinox.launcher") && name.endsWith(".jar"));
        if (files == null || files.length == 0) return null;

        // Pick the first one found (or sort for latest)
        return files[0];
    }

    private static String getPlatform() {
        String os = System.getProperty("os.name").toLowerCase(Locale.ENGLISH);
        if (os.contains("win")) return "win";
        if (os.contains("mac")) return "mac";
        return "linux"; // default to Linux
    }
}
