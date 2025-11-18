# Court Data Fetching Implementation Guide

This document provides a comprehensive guide on how court room details are fetched in this testimony web application. Use this as a reference to implement similar functionality in other applications.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Configuration](#api-configuration)
3. [Data Types and Interfaces](#data-types-and-interfaces)
4. [Core API Methods](#core-api-methods)
5. [Implementation Patterns](#implementation-patterns)
6. [Error Handling Strategies](#error-handling-strategies)
7. [API Endpoints](#api-endpoints)
8. [Usage Examples](#usage-examples)
9. [Best Practices](#best-practices)

## Architecture Overview

The court data fetching system follows a centralized API service pattern with the following key components:

- **Centralized API Service** (`services/api.ts`) - Single source of truth for all API calls
- **TypeScript Interfaces** - Strongly typed data structures
- **Retry Logic** - Automatic retry with exponential backoff
- **Timeout Handling** - Request timeout management
- **Error Handling** - Graceful error handling with user feedback
- **Parallel Fetching** - Efficient data loading using `Promise.all()`

## API Configuration

```typescript
const API_BASE_URL = "https://testimonyapi.soxfort.com";

// Configuration for API requests
const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};
```

### Timeout Helper Function

```typescript
const fetchWithTimeout = async (
  url: string, 
  options: RequestInit = {}, 
  timeout = API_CONFIG.timeout
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
};
```

### Retry Logic

```typescript
const retryFetch = async (
  url: string, 
  options: RequestInit = {}, 
  maxRetries = API_CONFIG.retryAttempts
): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API request attempt ${attempt}/${maxRetries} to ${url}`);
      const response = await fetchWithTimeout(url, options);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`API request attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) break;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, API_CONFIG.retryDelay * attempt)
      );
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
};
```

## Data Types and Interfaces

### Court Interface

```typescript
export interface Court {
  court_id: number;
  court_name: string;
  address?: string;
  contact_info?: string;
  created_at?: string;
  courtrooms?: Courtroom[]; // Optional nested courtrooms
}
```

### Courtroom Interface

```typescript
export interface Courtroom {
  court_id: number;
  courtroom_id: number;
  courtroom_name: string;
}
```

### Extended Types (Alternative Implementation)

```typescript
// Alternative type definitions found in types/court-system.ts
export interface Court {
  id: string;
  name: string;
  courtrooms: Courtroom[];
}

export interface Courtroom {
  id: string;
  name: string;
}
```

## Core API Methods

### Fetch Courts

```typescript
getCourts: async (): Promise<Court[]> => {
  try {
    const response = await retryFetch(`${API_BASE_URL}/courts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch courts: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getCourts:', error);
    throw error;
  }
}
```

### Fetch Courtrooms

```typescript
getCourtrooms: async (): Promise<Courtroom[]> => {
  try {
    const response = await retryFetch(`${API_BASE_URL}/courtrooms`);
    if (!response.ok) {
      throw new Error(`Failed to fetch courtrooms: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getCourtrooms:', error);
    throw error;
  }
}
```

### Add Court

```typescript
addCourt: async (court: Omit<Court, "court_id">): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/add_court`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(court),
  });
  if (!response.ok) {
    throw new Error("Failed to add court");
  }
}
```

### Add Courtroom

```typescript
addCourtroom: async (
  courtroom: Omit<Courtroom, "courtroom_id">
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/add_courtroom`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(courtroom),
  });
  if (!response.ok) {
    throw new Error("Failed to add courtroom");
  }
}
```

### Delete Operations

```typescript
deleteCourt: async (court_id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/delete_court/${court_id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to delete court");
  }
}

deleteCourtroom: async (courtroomId: number): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/delete_courtrooms/${courtroomId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to delete courtroom");
  }
}
```

## Implementation Patterns

### Pattern 1: Parallel Fetching (Recommended)

```typescript
useEffect(() => {
  const fetchCourtsAndCourtrooms = async () => {
    try {
      const [courtsData, courtroomsData] = await Promise.all([
        recordingsApi.getCourts(),
        recordingsApi.getCourtrooms(),
      ]);
      setCourts(courtsData);
      setCourtrooms(courtroomsData);
    } catch (error) {
      console.error("Error fetching courts and courtrooms:", error);
      toast({
        title: "Error",
        description: "Failed to fetch courts and courtrooms.",
        variant: "destructive",
      });
    }
  };

  fetchCourtsAndCourtrooms();
}, [toast]);
```

### Pattern 2: Robust Error Handling with Fallbacks

```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      // Fetch data in parallel but handle failures gracefully
      const results = await Promise.allSettled([
        recordingsApi.getCourts(),
        recordingsApi.getCourtrooms(),
      ]);

      // Handle courts data
      if (results[0].status === 'fulfilled') {
        setCourts(results[0].value);
      } else {
        console.warn("Failed to fetch courts:", results[0].reason);
        setCourts([]); // Set empty array as fallback
      }

      // Handle courtrooms data
      if (results[1].status === 'fulfilled') {
        setCourtrooms(results[1].value);
      } else {
        console.warn("Failed to fetch courtrooms:", results[1].reason);
        setCourtrooms([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error("Error fetching supplementary data:", error);
    }
  };

  fetchData();
}, []);
```

### Pattern 3: Data Transformation

```typescript
const fetchCourts = async () => {
  try {
    const data = await recordingsApi.getCourts();
    const transformedCourts = data.map((court: any) => ({
      court_id: court.court_id,
      court_name: court.court_name,
      address: court.address,
      contact_info: court.contact_info,
      created_at: court.created_at,
      courtrooms: court.courtrooms || [],
    }));
    setCourts(transformedCourts);
  } catch (error) {
    console.error("Error fetching courts:", error);
    toast({
      title: "Error",
      description: "Failed to fetch courts.",
      variant: "destructive",
    });
  }
};
```

### Pattern 4: Loading States and User Feedback

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchRecordings = async () => {
  try {
    setIsLoading(true);
    setError(null);
    const data = await recordingsApi.getAllRecordings();
    setRecordings(data);
  } catch (error) {
    console.error("Error fetching recordings:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch recordings";
    setError(errorMessage);
  } finally {
    setIsLoading(false);
  }
};
```

## Error Handling Strategies

### 1. Graceful Degradation

```typescript
// Use Promise.allSettled for non-critical data
const results = await Promise.allSettled([
  recordingsApi.getCourts(),
  recordingsApi.getCourtrooms(),
]);

// Handle each result independently
results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    // Handle success
  } else {
    // Log warning and continue with fallback
    console.warn(`Failed to fetch data ${index}:`, result.reason);
  }
});
```

### 2. User Feedback

```typescript
try {
  await recordingsApi.addCourt(court);
  toast({
    title: "Success",
    description: "Court added successfully.",
  });
} catch (error) {
  toast({
    title: "Error",
    description: "Failed to add court.",
    variant: "destructive",
  });
}
```

### 3. Retry with User Notification

```typescript
const [retryAttempt, setRetryAttempt] = useState(0);

const fetchWithRetryNotification = async () => {
  try {
    const data = await recordingsApi.getCourts();
    setRetryAttempt(0); // Reset on success
    return data;
  } catch (error) {
    setRetryAttempt(prev => prev + 1);
    if (retryAttempt < 3) {
      // Show retry notification
      toast({
        title: "Connection Issue",
        description: `Retrying... (Attempt ${retryAttempt + 1}/3)`,
      });
    }
    throw error;
  }
};
```

## API Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/courts` | Fetch all courts | None |
| GET | `/courtrooms` | Fetch all courtrooms | None |
| POST | `/add_court` | Add a new court | `Court` object |
| POST | `/add_courtroom` | Add a new courtroom | `Courtroom` object |
| DELETE | `/delete_court/{court_id}` | Delete a court | None |
| DELETE | `/delete_courtrooms/{courtroomId}` | Delete a courtroom | None |

### Expected Response Formats

#### Courts Response

```json
[
  {
    "court_id": 1,
    "court_name": "High Court",
    "address": "123 Justice Street",
    "contact_info": "phone: +263-1-234567",
    "created_at": "2024-01-15T10:30:00Z",
    "courtrooms": [
      {
        "court_id": 1,
        "courtroom_id": 101,
        "courtroom_name": "Courtroom A"
      }
    ]
  }
]
```

#### Courtrooms Response

```json
[
  {
    "court_id": 1,
    "courtroom_id": 101,
    "courtroom_name": "Courtroom A"
  },
  {
    "court_id": 1,
    "courtroom_id": 102,
    "courtroom_name": "Courtroom B"
  }
]
```

## Usage Examples

### Complete React Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { recordingsApi, type Court, type Courtroom } from '@/services/api';

const CourtsManager: React.FC = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtrooms, setCourtrooms] = useState<Courtroom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [courtsData, courtroomsData] = await Promise.all([
          recordingsApi.getCourts(),
          recordingsApi.getCourtrooms(),
        ]);
        
        setCourts(courtsData);
        setCourtrooms(courtroomsData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
        setError(errorMessage);
        console.error('Error fetching court data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddCourt = async (courtData: Omit<Court, 'court_id'>) => {
    try {
      await recordingsApi.addCourt(courtData);
      
      // Refresh courts list
      const updatedCourts = await recordingsApi.getCourts();
      setCourts(updatedCourts);
      
      console.log('Court added successfully');
    } catch (err) {
      console.error('Error adding court:', err);
    }
  };

  if (isLoading) return <div>Loading courts...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Courts ({courts.length})</h2>
      {courts.map(court => (
        <div key={court.court_id}>
          <h3>{court.court_name}</h3>
          <p>{court.address}</p>
          <p>Contact: {court.contact_info}</p>
        </div>
      ))}
      
      <h2>Courtrooms ({courtrooms.length})</h2>
      {courtrooms.map(courtroom => (
        <div key={courtroom.courtroom_id}>
          <span>{courtroom.courtroom_name}</span>
          <small> (Court ID: {courtroom.court_id})</small>
        </div>
      ))}
    </div>
  );
};

export default CourtsManager;
```

### Utility Function for Court-Courtroom Mapping

```typescript
// Utility function to get court name for a recording
export function getCourtNameForRecording(
  recording: { court: string; courtroom: string },
  courts: Court[],
  courtrooms: Courtroom[]
): string {
  // The API already provides the court name, so use it directly
  if (recording.court) {
    // Validate against courts list for consistency
    const courtExists = courts.some(c => c.court_name === recording.court);
    if (courtExists) {
      return recording.court;
    }
  }
  
  // Fallback: find court through courtroom mapping
  const courtroom = courtrooms.find(cr => cr.courtroom_name === recording.courtroom);
  if (courtroom) {
    const court = courts.find(c => c.court_id === courtroom.court_id);
    if (court) {
      return court.court_name;
    }
  }
  
  // Final fallback
  return recording.court || "Unknown Court";
}
```

## Best Practices

### 1. **Centralized API Service**
- Keep all API calls in a single service file
- Use consistent error handling across all endpoints
- Implement retry logic and timeout handling

### 2. **Type Safety**
- Define TypeScript interfaces for all data structures
- Use generic types for reusable API functions
- Leverage type inference where possible

### 3. **Performance Optimization**
- Use `Promise.all()` for parallel data fetching
- Implement proper loading states
- Consider caching for frequently accessed data

### 4. **Error Handling**
- Use `Promise.allSettled()` for non-critical data
- Provide meaningful error messages to users
- Implement fallback states for graceful degradation

### 5. **User Experience**
- Show loading indicators during data fetching
- Provide feedback for successful/failed operations
- Implement proper retry mechanisms with user notification

### 6. **Code Organization**
- Separate data fetching logic from UI components
- Use custom hooks for reusable data fetching logic
- Keep API configuration centralized and configurable

### 7. **Testing Considerations**
- Mock API calls in tests
- Test error handling scenarios
- Verify retry logic and timeout behavior

## Security Considerations

### 1. **Authentication**
```typescript
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Use in API calls
const response = await retryFetch(`${API_BASE_URL}/courts`, {
  headers: getAuthHeaders(),
});
```

### 2. **Input Validation**
```typescript
const validateCourtData = (court: Partial<Court>): boolean => {
  return !!(court.court_name && court.court_name.trim().length > 0);
};

const addCourt = async (courtData: Omit<Court, 'court_id'>) => {
  if (!validateCourtData(courtData)) {
    throw new Error('Invalid court data');
  }
  // Proceed with API call
};
```

### 3. **Rate Limiting**
```typescript
// Implement rate limiting for API calls
const rateLimiter = {
  lastCall: 0,
  minInterval: 100, // 100ms between calls
  
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastCall)
      );
    }
    
    this.lastCall = Date.now();
    return fn();
  }
};
```

---

This guide provides a comprehensive overview of the court data fetching implementation. Use it as a reference when implementing similar functionality in other applications, adapting the patterns and practices to your specific requirements and tech stack.
