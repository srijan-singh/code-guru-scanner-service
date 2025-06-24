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

import lombok.extern.slf4j.Slf4j;
import org.eclipse.lsp4j.*;
import org.eclipse.lsp4j.jsonrpc.messages.Either;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Files;
import java.nio.file.Paths;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Slf4j
public class LSPInitializer {

    public static void initialize(LanguageServer server, String rootUri) throws Exception {
        InitializeParams params = new InitializeParams();
        params.setRootUri(rootUri);
        params.setCapabilities(new ClientCapabilities());

        // Add this:
        params.setWorkspaceFolders(List.of(new WorkspaceFolder(rootUri)));

        log.info("Initializing LSP with rootUri: {}", rootUri);
        server.initialize(params).get();  // blocking
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

        log.info("Opened file: {}", filePath);
    }

    public static void getSymbols(LanguageServer server, String filePath) throws Exception {
        String uri = Paths.get(filePath).toUri().toString();

        TextDocumentIdentifier docId = new TextDocumentIdentifier(uri);
        DocumentSymbolParams params = new DocumentSymbolParams(docId);

        log.info("Requesting document symbols for: {}", uri);
        CompletableFuture<List<Either<SymbolInformation, DocumentSymbol>>> future =
                server.getTextDocumentService().documentSymbol(params);

        List<Either<SymbolInformation, DocumentSymbol>> symbols = future.get();

        log.info("=== Symbols in {} ===", filePath);
        for (Either<SymbolInformation, DocumentSymbol> symbol : symbols) {
            if (symbol.isRight()) {
                logSymbol(symbol.getRight(), 0);
            } else if (symbol.isLeft()) {
                SymbolInformation info = symbol.getLeft();
                log.info("- {} ({}) [{}]", info.getName(), info.getKind(), info.getLocation().getUri());
            }
        }
    }

    private static void logSymbol(DocumentSymbol symbol, int indent) {
        String prefix = " ".repeat(indent * 2);
        log.info("{}- {} ({})", prefix, symbol.getName(), symbol.getKind());

        if (symbol.getChildren() != null) {
            for (DocumentSymbol child : symbol.getChildren()) {
                logSymbol(child, indent + 1);
            }
        }
    }
}
