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
package code.guru.lsp;

import org.eclipse.lsp4j.*;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Files;
import java.nio.file.Paths;

public class LSPInitializer {

    public static void initialize(LanguageServer server, String rootUri) throws Exception {
        InitializeParams params = new InitializeParams();
        params.setRootUri(rootUri);
        params.setCapabilities(new ClientCapabilities());
        server.initialize(params).get();
        server.initialized(new InitializedParams());
    }

    public static void openFile(LanguageServer server, String filePath) throws Exception {
        String content = new String(Files.readAllBytes(Paths.get(filePath)));

        TextDocumentItem doc = new TextDocumentItem();
        doc.setUri(Paths.get(filePath).toUri().toString());
        doc.setLanguageId("java");
        doc.setVersion(1);
        doc.setText(content);

        DidOpenTextDocumentParams openParams = new DidOpenTextDocumentParams(doc);
        server.getTextDocumentService().didOpen(openParams);
    }
}
