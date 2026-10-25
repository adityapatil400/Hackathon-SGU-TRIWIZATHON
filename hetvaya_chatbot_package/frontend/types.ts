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
  systemResources?: Record<string, any>;
}

export interface AgenticToolExecution {
  tool_name: string;
  inputs?: Record<string, any>;
  output_summary?: string;
  status?: string;
}

export interface ChatQueryResponse {
  answer: string;
  conversation_id?: string;
  sources: ChatSourceItem[];
  intent: string;
  suggested_followups: string[];
  is_ai_generated: boolean;
  active_model?: string;
  tools_executed?: AgenticToolExecution[];
  structured_card?: Record<string, any>;
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
  activeModel?: string;
  toolsExecuted?: AgenticToolExecution[];
  structuredCard?: Record<string, any>;
  missingInformation?: string;
  isError?: boolean;
  isPending?: boolean;
  context?: ChatContext;
}
