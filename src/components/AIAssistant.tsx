"use client";

import { User } from '@/lib/auth-service';
import { ChatEntry } from '../types';

interface AIAssistantProps {
  user: User | null;
  prompt: string;
  setPrompt: (prompt: string) => void;
  chatHistory: ChatEntry[];
  handleSendMessage: () => void;
}

export default function AIAssistant({
  user,
  prompt,
  setPrompt,
  chatHistory,
  handleSendMessage
}: AIAssistantProps) {
  return (
    <section className="section-stack">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Gemini enterprise assistant</h3>
            <p className="panel__description">Ask questions in Bahasa Indonesia or English about policy, planning, or project workflows.</p>
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-log">
            {chatHistory.length ? (
              chatHistory.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.timestamp}`}
                  className={`chat-message chat-message--${message.role}`}
                >
                  <span className="chat-message__meta">{message.role === 'assistant' ? 'Gemini · ' : 'You · '}{new Date(message.timestamp).toLocaleTimeString()}</span>
                  <span>{message.content}</span>
                </div>
              ))
            ) : (
              <p className="section-description">Start a conversation to receive tailored guidance for PT Benwin Indonesia initiatives.</p>
            )}
          </div>

          <div className="chat-form">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask the assistant about policy updates, project plans, or employee processes..."
            />
            <button className="btn btn-primary" onClick={handleSendMessage} disabled={!user || !prompt.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}