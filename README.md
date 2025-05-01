# M31 Agent

M31 Agent is an AI-powered coding assistant for VS Code that integrates with OpenRouter AI's API to provide intelligent coding assistance, explanations, and more.

## Features

- **AI-Powered Chat**: Interact with AI models like GPT-4, Claude, and Gemini directly within VS Code
- **Code Explanations**: Get explanations for selected code snippets
- **Code Generation**: Generate code based on natural language descriptions
- **Terminal Integration**: Execute terminal commands with AI assistance
- **Multi-Language Support**: Works with TypeScript, JavaScript, Python, Java, C/C++, Go, Ruby, PHP, Rust, Swift, Kotlin, and more
- **Context-Aware**: Understands your codebase for more relevant assistance

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run `M31 Agent: Configure Settings`
3. Enter your OpenRouter API key (get one at [OpenRouter.ai](https://openrouter.ai))
4. Access the chat panel by clicking the M31 Agent icon in the status bar or using the command palette

## Commands

- `M31 Agent: Show Chat` - Open the chat panel
- `M31 Agent: Configure Settings` - Configure extension settings
- `M31 Agent: Quick Chat` (`Ctrl+Alt+M` / `Cmd+Alt+M`) - Quick access to chat
- `M31 Agent: Explain Code` (`Ctrl+Alt+E` / `Cmd+Alt+E`) - Explain selected code
- `M31 Agent: Generate Code` - Generate code based on a description
- `M31 Agent: Run Command` - Run a terminal command with AI assistance
- `M31 Agent: Navigate Codebase` - Get help navigating the codebase

## Requirements

- VS Code 1.80.0 or higher
- An API key from [OpenRouter.ai](https://openrouter.ai)
- Internet connection

## Extension Settings

- `m31-agent.modelId`: AI model to use (default: "openai/gpt-4o")
- `m31-agent.maxTokens`: Maximum tokens for responses (default: 1024)
- `m31-agent.temperature`: Temperature for generation (default: 0.7)
- `m31-agent.requireConfirmation`: Require confirmation before executing commands (default: true)
- `m31-agent.enableTelemetry`: Enable telemetry (default: true)
- `m31-agent.logLevel`: Log level (default: "info")

## Privacy & Security

This extension requires an API key to function. Your API key is stored securely in VS Code's secret storage and is never shared. The extension communicates directly with the OpenRouter API. Code snippets and commands are sent to the API only when you explicitly interact with the extension.

## License

MIT

## Acknowledgements

- OpenRouter AI for providing the API
- The VS Code team for the excellent extension API
- The open-source community for inspiration and libraries

## Support

If you encounter any issues or have feature requests, please submit them on our [GitHub repository](https://github.com/m31-ai/m31-agent-vscode/issues). 