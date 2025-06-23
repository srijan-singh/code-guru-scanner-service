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
package code.guru.lsp.client;

import org.eclipse.lsp4j.MessageActionItem;
import org.eclipse.lsp4j.ShowMessageRequestParams;
import org.eclipse.lsp4j.services.LanguageClient;

import java.util.concurrent.CompletableFuture;

public class SimpleLanguageClient implements LanguageClient {
    @Override
    public void telemetryEvent(Object object) {}

    @Override
    public void publishDiagnostics(org.eclipse.lsp4j.PublishDiagnosticsParams diagnostics) {
        System.out.println("Diagnostics: " + diagnostics);
    }

    @Override
    public void showMessage(org.eclipse.lsp4j.MessageParams messageParams) {
        System.out.println("Message: " + messageParams.getMessage());
    }

    @Override
    public CompletableFuture<MessageActionItem> showMessageRequest(ShowMessageRequestParams requestParams) {
        return null;
    }

    @Override
    public void logMessage(org.eclipse.lsp4j.MessageParams message) {
        System.out.println("Log: " + message.getMessage());
    }
}
