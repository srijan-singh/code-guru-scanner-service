import * as path from 'path';

export class LSPConfig {

    private ROOT: string = "../..";
    private LSP_SERVER_PATH: string = "lsp-server";
    private PLUGINS = "plugins";

    // Java LSP Server
    private JAVA_SERVER_PATH: string = "java";
    private JAVA_LSP_LATEST_VERSION: string = "jdt-language-server-1.48.0-202505152338";

    public getJavaLSPServerPath(): string {
        return path.join(__dirname, this.ROOT, this.LSP_SERVER_PATH, this.JAVA_SERVER_PATH, this.JAVA_LSP_LATEST_VERSION);
    }

    public getJavaLSPServerPluginPath(): string {
        return path.join(this.getJavaLSPServerPath(), this.PLUGINS);
    }
}
