// Extend basic LSP types for convenience if needed, or use directly from import
export class LSPMessage {
    public jsonrpc: "2.0"; // Always "2.0" for current LSP specification
    public id?: number | string | null; // Optional: Used for requests and responses
    public method?: string; // Optional: Used for requests and notifications
    public params?: any; // Optional: Data for requests or notifications
    public result?: any; // Optional: Result data for responses
    public error?: {    // Optional: Error data for responses
        code: number;
        message: string;
        data?: any;
    };

    /**
     * Creates an instance of LSPMessage.
     * @param jsonrpc The LSP version, defaults to "2.0".
     */
    constructor(jsonrpc: "2.0" = "2.0") {
        this.jsonrpc = jsonrpc;
    }

    /**
     * Helper to create a request message.
     * @param id The request ID.
     * @param method The method name.
     * @param params Optional parameters for the method.
     * @returns An LSPMessage instance configured as a request.
     */
    public static createRequest(id: number | string, method: string, params?: any): LSPMessage {
        const msg = new LSPMessage();
        msg.id = id;
        msg.method = method;
        msg.params = params;
        return msg;
    }

    /**
     * Helper to create a response message for a successful request.
     * @param id The ID of the request this is a response to.
     * @param result The result of the request.
     * @returns An LSPMessage instance configured as a successful response.
     */
    public static createResponse(id: number | string | null, result?: any): LSPMessage {
        const msg = new LSPMessage();
        msg.id = id;
        msg.result = result;
        return msg;
    }

    /**
     * Helper to create an error response message.
     * @param id The ID of the request this is an error response to (can be null for parse errors).
     * @param code The error code.
     * @param message The error message.
     * @param data Optional additional error data.
     * @returns An LSPMessage instance configured as an error response.
     */
    public static createErrorResponse(id: number | string | null, code: number, message: string, data?: any): LSPMessage {
        const msg = new LSPMessage();
        msg.id = id;
        msg.error = { code, message, data };
        return msg;
    }

    /**
     * Helper to create a notification message.
     * @param method The method name for the notification.
     * @param params Optional parameters for the notification.
     * @returns An LSPMessage instance configured as a notification.
     */
    public static createNotification(method: string, params?: any): LSPMessage {
        const msg = new LSPMessage();
        msg.method = method;
        msg.params = params;
        return msg;
    }

    /**
     * Checks if the message is a request.
     * @returns True if the message has an id and a method.
     */
    public isRequest(): boolean {
        return this.id !== undefined && this.method !== undefined;
    }

    /**
     * Checks if the message is a response.
     * @returns True if the message has an id and either result or error.
     */
    public isResponse(): boolean {
        return this.id !== undefined && (this.result !== undefined || this.error !== undefined);
    }

    /**
     * Checks if the message is a notification.
     * @returns True if the message has a method but no id, result, or error.
     */
    public isNotification(): boolean {
        return this.method !== undefined && this.id === undefined && this.result === undefined && this.error === undefined;
    }
}

// Utility to parse LSP messages from a stream
export class LSPMessageParser {
    private buffer: string = '';
    // More strict regex that ensures proper LSP header format
    private readonly HEADER_REGEX = /Content-Length: (\d+)\r\n(?:Content-Type: [^\r\n]+\r\n)?\r\n/;

    public parse(data: string, onMessage: (message: LSPMessage) => void): void {
        this.buffer += data;
        
        // First, let's filter out any non-LSP data that might be mixed in
        // Look for the start of a proper LSP message
        const lspStartIndex = this.buffer.indexOf('Content-Length:');
        if (lspStartIndex > 0) {
            // Remove any non-LSP data before the first Content-Length header
            console.warn('Discarding non-LSP data:', this.buffer.substring(0, lspStartIndex));
            this.buffer = this.buffer.substring(lspStartIndex);
        }
        
        let match;
        while ((match = this.buffer.match(this.HEADER_REGEX))) {
            const headerBlock = match[0]; // The entire matched header block
            const contentLength = parseInt(match[1], 10); // The captured content length
            const messageStart = headerBlock.length; // The position where the JSON content begins

            if (this.buffer.length >= messageStart + contentLength) {
                const message = this.buffer.substring(messageStart, messageStart + contentLength);
                console.log("\t*************************\n")
                console.log(message)
                console.log("\t*************************\n")
                try {
                    const parsedMessage: LSPMessage = JSON.parse(message);
                    onMessage(parsedMessage);
                    this.buffer = this.buffer.substring(messageStart + contentLength);
                } catch (e) {
                    console.error('Failed to parse JSON message:', e);
                    console.error('Raw message:', JSON.stringify(message));
                    console.error('Header block:', JSON.stringify(headerBlock));
                    
                    // Try to find the next valid LSP message instead of clearing entire buffer
                    const nextLspIndex = this.buffer.indexOf('Content-Length:', messageStart + contentLength);
                    if (nextLspIndex !== -1) {
                        this.buffer = this.buffer.substring(nextLspIndex);
                    } else {
                        this.buffer = ''; // Clear buffer if no more LSP messages found
                    }
                    break;
                }
            } else {
                break; // Not enough data for the full message yet
            }
        }
        
        // If buffer doesn't start with Content-Length but has content, it might be garbage
        if (this.buffer && !this.buffer.startsWith('Content-Length:')) {
            const nextLspIndex = this.buffer.indexOf('Content-Length:');
            if (nextLspIndex !== -1) {
                console.warn('Discarding garbage data:', this.buffer.substring(0, nextLspIndex));
                this.buffer = this.buffer.substring(nextLspIndex);
            } else if (this.buffer.length > 1000) {
                // If buffer is getting too large without any LSP messages, clear it
                console.warn('Clearing large buffer with no LSP messages');
                this.buffer = '';
            }
        }
    }
}

// Utility to serialize LSP messages for a stream
export function serializeLSPMessage(message: LSPMessage): string {
    const json = JSON.stringify(message);
    const contentLength = Buffer.byteLength(json, 'utf8');
    return `Content-Length: ${contentLength}\r\nContent-Type: application/vscode-jsonrpc; charset=utf-8\r\n\r\n${json}`;
}
