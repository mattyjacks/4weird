/**
 * AutoCode Chat Module
 * AI chat interface with streaming and conversation history
 */

class ChatMessage {
  constructor(role, content, metadata = {}) {
    this.id = Date.now() + Math.random().toString(36).substr(2, 9);
    this.role = role; // 'user', 'assistant', 'system'
    this.content = content;
    this.timestamp = Date.now();
    this.metadata = metadata;
    this.streaming = false;
  }
}

class AIChatInterface {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || 50;
    this.messages = [];
    this.streamingEnabled = options.streamingEnabled !== false;
    this.onMessage = null;
    this.onStream = null;
    this.onError = null;
    this.contextFiles = new Set();
    this.isProcessing = false;
  }

  addMessage(role, content, metadata = {}) {
    const message = new ChatMessage(role, content, metadata);
    this.messages.push(message);

    // Trim history
    while (this.messages.length > this.maxHistory) {
      // Keep system messages, remove oldest user/assistant
      const removableIdx = this.messages.findIndex(m => m.role !== 'system');
      if (removableIdx >= 0) {
        this.messages.splice(removableIdx, 1);
      }
    }

    if (this.onMessage) {
      this.onMessage(message);
    }

    return message;
  }

  async sendMessage(content, options = {}) {
    if (this.isProcessing) {
      throw new Error('Already processing a message');
    }

    this.isProcessing = true;

    try {
      // Add user message
      const userMsg = this.addMessage('user', content, {
        files: Array.from(this.contextFiles),
        ...options.metadata
      });

      // Add placeholder for assistant response
      const assistantMsg = this.addMessage('assistant', '', {
        streaming: true
      });
      assistantMsg.streaming = true;

      if (this.onStream) {
        this.onStream({ type: 'start', messageId: assistantMsg.id });
      }

      // Simulate streaming (replace with actual API call)
      const response = await this.simulateStreamResponse(content, assistantMsg);

      assistantMsg.content = response;
      assistantMsg.streaming = false;

      if (this.onStream) {
        this.onStream({ type: 'end', messageId: assistantMsg.id, content: response });
      }

      return assistantMsg;

    } catch (err) {
      if (this.onError) {
        this.onError(err);
      }
      throw err;
    } finally {
      this.isProcessing = false;
    }
  }

  async simulateStreamResponse(content, message) {
    // Replace this with actual LLM API streaming
    const words = 'I am analyzing your request and will help you modify the code. [This is a simulated response. Connect to an actual LLM API for real responses.]';

    let response = '';
    for (const word of words.split(' ')) {
      response += word + ' ';
      message.content = response.trim();

      if (this.onStream) {
        this.onStream({
          type: 'chunk',
          messageId: message.id,
          chunk: word + ' ',
          content: message.content
        });
      }

      await new Promise(r => setTimeout(r, 50)); // Simulate network delay
    }

    return response.trim();
  }

  setContextFiles(filePaths) {
    this.contextFiles = new Set(filePaths);
  }

  addContextFile(filePath) {
    this.contextFiles.add(filePath);
  }

  removeContextFile(filePath) {
    this.contextFiles.delete(filePath);
  }

  clearContext() {
    this.contextFiles.clear();
  }

  getContextFiles() {
    return Array.from(this.contextFiles);
  }

  getHistory() {
    return [...this.messages];
  }

  getRecentMessages(count = 10) {
    return this.messages.slice(-count);
  }

  clearHistory() {
    this.messages = [];
    this.contextFiles.clear();
  }

  exportChat() {
    return {
      timestamp: Date.now(),
      messages: this.messages,
      contextFiles: Array.from(this.contextFiles)
    };
  }

  importChat(data) {
    if (data.messages) {
      this.messages = data.messages.map(m => ({
        ...m,
        id: m.id || Date.now() + Math.random().toString(36).substr(2, 9)
      }));
    }
    if (data.contextFiles) {
      this.contextFiles = new Set(data.contextFiles);
    }
  }

  getTokenCount() {
    // Rough estimate
    return this.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  }
}

module.exports = { AIChatInterface, ChatMessage };
