# dead man switch Switch - UI Integration Guide

## Overview

This guide covers how to integrate the dead man switch Switch system with your frontend UI, including triggering dead man switch checks, listening to real-time events, and handling all the data flows.

## 🚀 Quick Start

### 1. Server Connection

```typescript
// Connect to the unified server (HTTP + WebSocket on port 3000)
const SERVER_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';
```

### 2. Initialize WebSocket Connection

```typescript
class DeadHandClient {
  private ws: WebSocket;
  private userAddress: string;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(WS_URL);
    
    this.ws.onopen = () => {
      console.log('Connected to dead man switch Switch Server');
      // Send user identification
      this.send({
        type: 'subscribe_token_activity',
        userAddress: this.userAddress
      });
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      // Implement reconnection logic
      setTimeout(() => this.connect(), 3000);
    };
  }

  private handleMessage(data: any) {
    const eventType = data.type;
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach(handler => handler(data));
  }

  // Event subscription
  on(eventType: string, handler: Function) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  private send(message: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
```

## 🎯 Core Integration Points

### 1. Trigger dead man switch Check

```typescript
async function initiateDeadHand(userAddress: string): Promise<InitiateDeadHandResponse> {
  try {
    const response = await fetch(`${SERVER_URL}/initiate-deadhand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: userAddress
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: InitiateDeadHandResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to initiate dead man switch:', error);
    throw error;
  }
}

// Usage
const result = await initiateDeadHand('0xb6a9f22642c126d2700cbd17940b334e866234ae');
console.log(result);
// {
//   "status": "success",
//   "message": "dead man switch check initiated successfully",
//   "scheduledAt": "2024-01-15T10:30:00.000Z",
//   "timeoutSeconds": 20
// }
```

### 2. Listen to Real-time Events

```typescript
const deadHandClient = new DeadHandClient('0xb6a9f22642c126d2700cbd17940b334e866234ae');

// Listen to AI status updates (real-time AI reasoning)
deadHandClient.on('ai_status_update', (data) => {
  console.log('AI Status:', data.data.message);
  console.log('Status Type:', data.data.statusType);
  console.log('Timestamp:', data.data.timestamp);
  
  // Update UI with AI progress
  updateAIStatusUI(data.data);
});

// Listen to dead man switch check results
deadHandClient.on('deadhand_check_result', (data) => {
  console.log('dead man switch Check Result:', data);
  
  // Update UI with final result
  updateDeadHandResultUI(data.data);
});

// Listen to dead man switch switch triggers
deadHandClient.on('deadhand_switch_triggered', (data) => {
  console.log('dead man switch Switch Triggered!', data);
  
  // Show critical alert to user
  showDeadHandAlert(data.data);
});

// Listen to timer resets
deadHandClient.on('deadhand_timer_reset', (data) => {
  console.log('Timer Reset:', data);
  
  // Update countdown timer
  updateTimerUI(data.data);
});
```

## 📊 Event Data Structures

### 1. AI Status Update Events

```typescript
interface AIStatusUpdateEvent {
  type: 'ai_status_update';
  userAddress: string;
  data: {
    message: string;           // Human-readable AI status message
    statusType: string;        // Type of status update
    timestamp: string;         // ISO timestamp
  };
  timestamp: string;
}

// Status Types:
// - 'info': General information
// - 'prompt': AI prompt being executed
// - 'tool_usage': Tool being used by AI
// - 'reasoning': AI reasoning process
// - 'twitter_check': Twitter activity check
// - 'combined_analysis': Combined blockchain + Twitter analysis
// - 'deadhand_initiated': dead man switch switch started
// - 'deadhand_step': dead man switch execution step
// - 'deadhand_completed': dead man switch switch completed
// - 'deadhand_error': dead man switch switch error
// - 'error': General error
```

### 2. dead man switch Check Result Events

```typescript
interface DeadHandCheckResultEvent {
  type: 'deadhand_check_result';
  userAddress: string;
  data: {
    aiResponse: string;        // AI's analysis response
    transactionData: any[];    // Raw transaction data found
    activityFound: boolean;    // Whether activity was detected
  };
  timestamp: string;
}
```

### 3. dead man switch Switch Triggered Events

```typescript
interface DeadHandSwitchEvent {
  type: 'deadhand_switch_triggered';
  userAddress: string;
  data: {
    smartAccount: string;      // Smart account address
    message: string;           // Human-readable message
    timestamp: string;         // ISO timestamp
  };
  timestamp: string;
}
```

### 4. Timer Reset Events

```typescript
interface TimerResetEvent {
  type: 'deadhand_timer_reset';
  userAddress: string;
  data: {
    timeoutSeconds: number;    // New timeout duration
    scheduledAt: string;       // When next check will occur
    message: string;           // Human-readable message
  };
  timestamp: string;
}
```

## 🎨 UI Implementation Examples

### 1. dead man switch Dashboard Component

```tsx
import React, { useState, useEffect } from 'react';

interface DeadHandDashboardProps {
  userAddress: string;
}

const DeadHandDashboard: React.FC<DeadHandDashboardProps> = ({ userAddress }) => {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [lastActivity, setLastActivity] = useState<boolean | null>(null);
  const [deadHandClient, setDeadHandClient] = useState<DeadHandClient | null>(null);

  useEffect(() => {
    const client = new DeadHandClient(userAddress);
    setDeadHandClient(client);

    // Set up event listeners
    client.on('ai_status_update', (data) => {
      setAiStatus(data.data.message);
    });

    client.on('deadhand_check_result', (data) => {
      setLastActivity(data.data.activityFound);
      if (data.data.activityFound) {
        setIsActive(true);
        setTimeRemaining(data.data.timeoutSeconds || 20);
      }
    });

    client.on('deadhand_timer_reset', (data) => {
      setTimeRemaining(data.data.timeoutSeconds);
      setIsActive(true);
    });

    client.on('deadhand_switch_triggered', (data) => {
      setIsActive(false);
      alert(`🚨 dead man switch Switch Triggered! Smart Account: ${data.data.smartAccount}`);
    });

    return () => {
      client.disconnect();
    };
  }, [userAddress]);

  const handleStartDeadHand = async () => {
    try {
      const result = await initiateDeadHand(userAddress);
      if (result.status === 'success') {
        setIsActive(true);
        setTimeRemaining(result.timeoutSeconds || 20);
      }
    } catch (error) {
      console.error('Failed to start dead man switch:', error);
    }
  };

  return (
    <div className="dead-hand-dashboard">
      <h2>dead man switch Switch</h2>
      
      <div className="status-section">
        <div className={`status-indicator ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? '🟢 Active' : '🔴 Inactive'}
        </div>
        
        {isActive && (
          <div className="timer">
            Time Remaining: {timeRemaining}s
          </div>
        )}
      </div>

      <div className="ai-status">
        <h3>AI Status</h3>
        <p>{aiStatus || 'Waiting for activity...'}</p>
      </div>

      <div className="last-activity">
        <h3>Last Activity Check</h3>
        {lastActivity !== null && (
          <p className={lastActivity ? 'activity-found' : 'no-activity'}>
            {lastActivity ? '✅ Activity Found' : '❌ No Activity'}
          </p>
        )}
      </div>

      <button 
        onClick={handleStartDeadHand}
        disabled={isActive}
        className="start-button"
      >
        {isActive ? 'dead man switch Active' : 'Start dead man switch'}
      </button>
    </div>
  );
};
```

### 2. Real-time AI Status Component

```tsx
interface AIStatusProps {
  client: DeadHandClient;
}

const AIStatusComponent: React.FC<AIStatusProps> = ({ client }) => {
  const [statusHistory, setStatusHistory] = useState<AIStatusUpdateEvent[]>([]);

  useEffect(() => {
    client.on('ai_status_update', (data: AIStatusUpdateEvent) => {
      setStatusHistory(prev => [data, ...prev].slice(0, 10)); // Keep last 10
    });
  }, [client]);

  return (
    <div className="ai-status-component">
      <h3>AI Analysis Progress</h3>
      <div className="status-list">
        {statusHistory.map((status, index) => (
          <div key={index} className={`status-item ${status.data.statusType}`}>
            <span className="timestamp">
              {new Date(status.data.timestamp).toLocaleTimeString()}
            </span>
            <span className="message">{status.data.message}</span>
            <span className="type">{status.data.statusType}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. Countdown Timer Component

```tsx
interface CountdownTimerProps {
  timeoutSeconds: number;
  onTimeout: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ timeoutSeconds, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onTimeout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="countdown-timer">
      <div className="timer-display">
        {formatTime(timeLeft)}
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${(timeLeft / timeoutSeconds) * 100}%` }}
        />
      </div>
    </div>
  );
};
```

## 🔧 Additional API Endpoints

### 1. Get Active Jobs

```typescript
async function getActiveJobs(): Promise<ActiveJobsResponse> {
  const response = await fetch(`${SERVER_URL}/jobs`);
  return response.json();
}

interface ActiveJobsResponse {
  status: 'success' | 'error';
  data: {
    activeJobs: CronJob[];
    status: {
      totalJobs: number;
      activeJobs: number;
      completedJobs: number;
    };
  };
}
```

### 2. Cancel Job

```typescript
async function cancelJob(jobId: string): Promise<CancelJobResponse> {
  const response = await fetch(`${SERVER_URL}/jobs/${jobId}`, {
    method: 'DELETE'
  });
  return response.json();
}

interface CancelJobResponse {
  status: 'success' | 'error';
  message: string;
}
```

### 3. Health Check

```typescript
async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${SERVER_URL}/health`);
  return response.json();
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
  cron: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
  };
  timestamp: string;
}
```

## 🎯 Complete Integration Example

```typescript
// Complete integration example
class DeadHandIntegration {
  private client: DeadHandClient;
  private userAddress: string;

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.client = new DeadHandClient(userAddress);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // AI Status Updates
    this.client.on('ai_status_update', (data) => {
      this.updateAIStatus(data.data);
    });

    // dead man switch Results
    this.client.on('deadhand_check_result', (data) => {
      this.handleDeadHandResult(data.data);
    });

    // dead man switch Switch Triggered
    this.client.on('deadhand_switch_triggered', (data) => {
      this.handleDeadHandSwitch(data.data);
    });

    // Timer Reset
    this.client.on('deadhand_timer_reset', (data) => {
      this.handleTimerReset(data.data);
    });
  }

  async startDeadHand(): Promise<boolean> {
    try {
      const result = await initiateDeadHand(this.userAddress);
      return result.status === 'success';
    } catch (error) {
      console.error('Failed to start dead man switch:', error);
      return false;
    }
  }

  private updateAIStatus(status: any) {
    // Update UI with AI status
    console.log('AI Status:', status.message);
    // Emit custom event or update state management
  }

  private handleDeadHandResult(result: any) {
    // Handle dead man switch check result
    console.log('Activity Found:', result.activityFound);
    // Update UI accordingly
  }

  private handleDeadHandSwitch(data: any) {
    // Handle dead man switch switch trigger
    console.log('dead man switch Switch Triggered!');
    // Show critical alert, update UI
  }

  private handleTimerReset(data: any) {
    // Handle timer reset
    console.log('Timer Reset:', data.timeoutSeconds);
    // Update countdown timer
  }

  disconnect() {
    this.client.disconnect();
  }
}

// Usage
const integration = new DeadHandIntegration('0xb6a9f22642c126d2700cbd17940b334e866234ae');
await integration.startDeadHand();
```

## 🚨 Error Handling

```typescript
// Handle connection errors
deadHandClient.on('error', (error) => {
  console.error('WebSocket Error:', error);
  // Show user-friendly error message
  showErrorMessage('Connection lost. Attempting to reconnect...');
});

// Handle API errors
async function initiateDeadHand(userAddress: string) {
  try {
    const response = await fetch(`${SERVER_URL}/initiate-deadhand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initiate dead man switch');
    }

    return await response.json();
  } catch (error) {
    // Handle network errors, validation errors, etc.
    console.error('dead man switch Initiation Error:', error);
    throw error;
  }
}
```

## 📱 Mobile Integration

For mobile apps, use the same WebSocket and HTTP endpoints:

```typescript
// React Native example
import { io } from 'socket.io-client';

class MobileDeadHandClient {
  private socket: any;
  private userAddress: string;

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.socket = io(WS_URL);
    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      this.socket.emit('subscribe_token_activity', {
        userAddress: this.userAddress
      });
    });

    this.socket.on('ai_status_update', (data) => {
      // Handle AI status updates
    });

    // ... other event handlers
  }
}
```

This guide provides everything you need to integrate the dead man switch Switch system with your UI, including real-time event handling, error management, and complete examples for both web and mobile applications.
