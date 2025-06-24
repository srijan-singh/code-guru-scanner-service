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
package code.guru;

import code.guru.lsp.LSPInitializer;
import code.guru.lsp.client.SimpleLanguageClient;
import code.guru.lsp.connector.LSPConnector;
import code.guru.lsp.launcher.JDTLauncher;
import code.guru.util.AppConfig;
import code.guru.util.ApplicationProperties;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.lsp4j.services.LanguageServer;

import java.io.File;
import java.nio.file.Paths;

@Slf4j
public class ScannerService {

    public String getGreeting() {
        return "Hello World!";
    }

    public static void main(String[] args) throws Exception {

        AppConfig appConfig = new AppConfig();

        String repoPath = appConfig.getOrThrow(ApplicationProperties.REPO_PATH);
        // root of your JDT LS checkout or zip
        String jdtLsHome = appConfig.getOrThrow(ApplicationProperties.JDTLS_HOME);
        String filePath = repoPath + appConfig.getOrThrow(ApplicationProperties.FILE_PATH);

        // Launch the JDT language server
        log.info("Launching JDT LS...");
        Process serverProcess = JDTLauncher.startJDTLanguageServer(new File(repoPath), jdtLsHome);

        // Connect the client to the server
        log.info("Launching Simple Language Client...");
        SimpleLanguageClient client = new SimpleLanguageClient();
        LanguageServer server = LSPConnector.connect(serverProcess, client);

        log.info("Initializing LSP...");
        // Initialize LSP session
        LSPInitializer.initialize(server, Paths.get(repoPath).toUri().toString());

        log.info("Opening File... {}", filePath);
        // Open a file and trigger analysis
        LSPInitializer.openFile(server, filePath);

        log.info("Symbols from file {}", filePath);
        // Semantic query: symbol extraction
        LSPInitializer.getSymbols(server, filePath);
    }
}

