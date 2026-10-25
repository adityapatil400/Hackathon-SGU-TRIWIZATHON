export interface ChatSourceItem {
  title: string;
  source_type: string;
  product_sku?: string;
  identifier?: string;
  verified_data: Record<string, any>;
}

export interface ChatContext {
  productSku?: string;
  productName?: string;
  warehouseId?: string;
  retailerId?: string;
  planCode?: string;
}

export interface ChatQueryResponse {
  answer: string;
  conversation_id?: string;
  sources: ChatSourceItem[];
  intent: string;
  suggested_followups: string[];
  is_ai_generated: boolean;
  missing_information?: string;
  response_timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: ChatSourceItem[];
  suggestedFollowups?: string[];
  isAiGenerated?: boolean;
  missingInformation?: string;
  isError?: boolean;
  isPending?: boolean;
  context?: ChatContext;
}
