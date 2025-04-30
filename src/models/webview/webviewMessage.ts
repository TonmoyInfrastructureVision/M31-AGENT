import { WebviewMessageType } from './webviewMessageType';
import { ExtensionConfiguration } from '../settings/extensionConfiguration';

interface BaseWebviewMessage {
    type: WebviewMessageType;
    payload: Record<string, any>;
}

interface InitializeMessage extends BaseWebviewMessage {
    type: WebviewMessageType.Initialize;
    payload: {};
}

interface UpdateConfigMessage extends BaseWebviewMessage {
    type: WebviewMessageType.UpdateConfig;
    payload: {
        config: ExtensionConfiguration;
    };
}

interface UserMessageMessage extends BaseWebviewMessage {
    type: WebviewMessageType.UserMessage;
    payload: {
        content: string;
    };
}

interface MessageMessage extends BaseWebviewMessage {
    type: WebviewMessageType.Message;
    payload: {
        message: {
            id: string;
            role: 'user' | 'assistant' | 'system';
            content: string;
        };
    };
}

interface ThinkingStartMessage extends BaseWebviewMessage {
    type: WebviewMessageType.ThinkingStart;
    payload: {};
}

interface ThinkingEndMessage extends BaseWebviewMessage {
    type: WebviewMessageType.ThinkingEnd;
    payload: {};
}

interface ErrorMessage extends BaseWebviewMessage {
    type: WebviewMessageType.Error;
    payload: {
        message: string;
        detail?: string;
    };
}

interface ClearChatMessage extends BaseWebviewMessage {
    type: WebviewMessageType.ClearChat;
    payload: {};
}

interface FocusInputMessage extends BaseWebviewMessage {
    type: WebviewMessageType.FocusInput;
    payload: {};
}

interface CancelRequestMessage extends BaseWebviewMessage {
    type: WebviewMessageType.CancelRequest;
    payload: {};
}

export type WebviewMessage =
    | InitializeMessage
    | UpdateConfigMessage
    | UserMessageMessage
    | MessageMessage
    | ThinkingStartMessage
    | ThinkingEndMessage
    | ErrorMessage
    | ClearChatMessage
    | FocusInputMessage
    | CancelRequestMessage; 