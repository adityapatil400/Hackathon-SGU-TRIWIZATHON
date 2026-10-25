# 🤖 HETVAYA Product AI Assistant — Standalone Package

A self-contained, enterprise-grade AI chatbot module for product intelligence, stock availability, batch-level FEFO expiry risks, warehouse sourcing, corridor freight costs, and FMCG distribution plan allocations.

This package contains **both backend and frontend** components, designed to run completely standalone or be plugged directly into any FastAPI + React application.

---

## 📁 Package Structure

```
hetvaya_chatbot_package/
├── README.md                      # Complete setup, architecture, and integration guide
├── requirements.txt               # Backend Python dependencies
├── package.json                   # Frontend npm peer dependencies
├── sample_queries.json            # Ready-to-use cURL queries and test payloads
├── backend/                       # Python / FastAPI Backend Module
│   ├── schemas.py                 # Pydantic request/response models
│   ├── chat_service.py            # Intelligence retrieval, Ollama reasoning & fallback engine
│   ├── router.py                  # Mountable FastAPI router (/api/ai/chat)
│   ├── standalone_server.py       # Runnable FastAPI microservice (port 8001)
│   └── test_standalone_chat.py   # Complete pytest test suite (10 tests)
└── frontend/                      # React / TypeScript Frontend Module
    ├── ProductAiAssistant.tsx     # Full React UI component (white & cream palette)
    ├── types.ts                   # TypeScript interfaces (ChatMessage, ChatContext, etc.)
    └── chatApi.ts                 # API client with offline fallback support
```

---

## ⚡ 1. Quick Start (Run Standalone in 30 Seconds)

### Step 1: Install Backend Requirements
```bash
cd hetvaya_chatbot_package
pip install -r requirements.txt
```

### Step 2: Start the Standalone Chatbot Server
```bash
python backend/standalone_server.py
```
The server will start on **`http://localhost:8001`**:
- **Interactive Swagger Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **Direct Chat Endpoint**: `POST http://localhost:8001/chat`
- **Router Endpoint**: `POST http://localhost:8001/api/ai/chat`
- **Health Check**: `GET http://localhost:8001/api/ai/chat/health`

### Step 3: Test with cURL
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Which products are at risk of expiry?"}'
```

---

## 🧪 2. Run Automated Tests

To run the complete 10-test suite verifying all query intents and endpoints:
```bash
pytest backend/test_standalone_chat.py -v
```
**Test Coverage**:
1. Out of stock inventory queries
2. FEFO shelf-life expiry risk analysis
3. SKU inventory level & warehouse breakdown
4. Supplying warehouse source determination
5. Distribution allocation justification
6. Corridor freight rates & transit calculations
7. Honest missing data disclosure (zero hallucination guarantee)
8. Multilingual response synthesis (Hindi/Marathi)
9. FastAPI `/chat` endpoint contract
10. System health check endpoint

---

## 🔌 3. How to Integrate into an Existing Project

### Option A: Integrate into FastAPI Backend
```python
from fastapi import FastAPI
from hetvaya_chatbot_package.backend.router import router as chatbot_router

app = FastAPI()

# Mount the chatbot routes
app.include_router(chatbot_router, prefix="/api")
```

### Option B: Integrate into React Frontend
Copy the `frontend/` folder into your React `src/components/` directory:
```tsx
import React, { useState } from 'react';
import { ProductAiAssistant } from './frontend/ProductAiAssistant';
import { ChatContext } from './frontend/types';

export const MyPage = () => {
  const [context, setContext] = useState<ChatContext | null>({
    productSku: 'SKU-ATT-05',
    productName: 'Aashirvaad Atta 5kg'
  });

  return (
    <div className="p-6">
      <ProductAiAssistant
        context={context}
        onClearContext={() => setContext(null)}
      />
    </div>
  );
};
```

---

## 🧠 4. Intelligence & Zero Hallucination Guarantee

The assistant enforces a strict **Zero Hallucination Guarantee**:
- **Ground Truth Grounding**: Retrieves real SKU attributes, active warehouse balances, batch expiry dates, and actual freight corridor rates.
- **Missing Data Transparency**: If a requested SKU or entity does not exist, the assistant explicitly states what information is missing instead of fabricating stock counts or dates.
- **Local Ollama Integration**: If a local Ollama instance (`http://localhost:11434`) is running with `llama3`, the assistant utilizes it for rich synthesis. If Ollama is offline or times out, the assistant immediately falls back to its high-speed deterministic natural language engine.

---

## 📜 5. API Request & Response Specification

### `POST /chat`

#### Request Body
```json
{
  "message": "What is the available inventory for Aashirvaad Atta?",
  "conversation_id": "optional-conv-id",
  "context": {
    "product_sku": "SKU-ATT-05",
    "product_name": "Aashirvaad Shudh Chakki Atta 5kg"
  },
  "language": "en"
}
```

#### Response Body
```json
{
  "answer": "Inventory Availability for Aashirvaad Shudh Chakki Atta 5kg (SKU-ATT-05):\n• Total Available Stock: 3,360 units (~280 cases)\n• Category: Staples & Grains\n• Case Size: 12 units/case\n\nWarehouse Allocation:\n- Pune Central Fulfilment Hub (W-PUN): 2,160 units (Batch B-PUN-ATT-091, Expiry: 2027-04-15)\n- Satara Regional Warehouse (W-SAT): 1,200 units (Batch B-SAT-ATT-104, Expiry: 2027-05-02)",
  "conversation_id": "optional-conv-id",
  "sources": [
    {
      "title": "Inventory Balance: Aashirvaad Shudh Chakki Atta 5kg",
      "source_type": "inventory",
      "product_sku": "SKU-ATT-05",
      "identifier": "SKU-ATT-05",
      "verified_data": {
        "sku": "SKU-ATT-05",
        "total_units": 3360,
        "cases": 280
      }
    }
  ],
  "intent": "stock_availability",
  "suggested_followups": [
    "Which warehouse can supply this product?",
    "What is the estimated freight cost from Pune to D-Mart?",
    "Which products are at risk of expiry?"
  ],
  "is_ai_generated": false,
  "missing_information": null,
  "response_timestamp": "2026-10-25T08:15:00.000000Z"
}
```

---

## 📄 License
MIT License. Created for HETVAYA Distribution Intelligence System.
