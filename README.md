# M31-Agent VS Code Extension

M31-Agent is an AI-powered coding assistant for VS Code that integrates with OpenRouter AI's API to provide intelligent code generation, explanation, and assistance directly in your editor.

## Features

- **AI Chat Interface**: Natural language chat with context-aware AI
- **Code Generation**: Generate code snippets and complete solutions
- **Code Explanation**: Get explanations for selected code
- **Terminal Command Execution**: Run commands with AI assistance
- **Project Navigation**: Navigate complex codebases with AI help
- **Multi-Language Support**: Works with TypeScript, JavaScript, Python, Java, C#, C++, Go, Rust, and many other languages

## Requirements

- Visual Studio Code 1.85.0 or higher
- An OpenRouter API key (register at [openrouter.ai](https://openrouter.ai))

## Installation

1. Install the extension from the VS Code Marketplace
2. Configure your OpenRouter API key (see configuration section below)
3. Access the agent through the command palette or the status bar icon

## Usage

### AI Chat

1. Click the M31-Agent icon in the status bar or run the "M31-Agent: Show Chat Panel" command
2. Type your questions or instructions in the chat panel
3. The AI will respond with helpful information, code snippets, or explanations

### Code Generation

1. Open a file where you want to insert code
2. Run the "M31-Agent: Generate Code" command
3. Describe what you want the AI to generate
4. Review and accept the generated code

### Code Explanation

1. Select the code you want to understand
2. Run the "M31-Agent: Explain Selected Code" command
3. The AI will provide an explanation in the chat panel

### Terminal Commands

1. Run the "M31-Agent: Run Terminal Command" command
2. Describe the command you want to run or what you want to accomplish
3. Review and confirm the suggested command

### Codebase Navigation

1. Run the "M31-Agent: Navigate Codebase" command
2. Describe what you're looking for in natural language
3. The AI will suggest relevant files and locations

## Configuration

### Extension Settings

This extension contributes the following settings:

* `m31-agent.apiKey`: Your OpenRouter API key (recommended to use VS Code secrets instead)
* `m31-agent.modelId`: AI model ID to use (default: "openai/gpt-4o")
* `m31-agent.maxTokens`: Maximum tokens for AI responses (default: 4096)
* `m31-agent.temperature`: Temperature for AI responses (default: 0.2)
* `m31-agent.logLevel`: Log level for the extension (debug, info, warning, error, none)
* `m31-agent.enableTelemetry`: Enable anonymous telemetry to improve the extension
* `m31-agent.requireConfirmation`: Require confirmation before executing file operations or terminal commands

### API Key Configuration

For security, it's recommended to store your API key in VS Code's secrets storage:

1. Run the "M31-Agent: Configure Settings" command
2. Select "Set API Key"
3. Enter your OpenRouter API key when prompted

## Security and Privacy

- Your API key is stored securely in VS Code's secret storage
- The extension requires explicit permission for file system operations and terminal commands
- Telemetry is opt-in and anonymized

## Development

### Building the Extension

```bash
git clone https://github.com/m31-ai/m31-agent-vscode.git
cd m31-agent-vscode
npm install
npm run compile
```

### Running the Extension

1. Open the project in VS Code
2. Press F5 to start debugging
3. A new VS Code window will open with the extension loaded

### Running Tests

```bash
npm test
```

## License

This extension is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- OpenRouter AI for providing the API
- The VS Code team for the excellent extension API
- The open-source community for inspiration and libraries

## Support

If you encounter any issues or have feature requests, please submit them on our [GitHub repository](https://github.com/m31-ai/m31-agent-vscode/issues). 