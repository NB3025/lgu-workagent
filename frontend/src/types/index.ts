export interface CustomerInfo {
  phone_number: string;
  subscription_number: string;
  name: string;
  status: string;
}

export interface RoamingPlan {
  plan_name: string;
  plan_code: string;
  duration: number;
  duration_unit: string;
  data_amount: string;
  voice_incoming_fee: number;
  voice_outgoing_fee: number;
  supported_countries: string[];
  price: number;
  description: string;
}

export interface RoamingSubscription {
  plan_name: string;
  plan_code: string;
  subscription_date: string;
  roaming_country: string;
  start_date: string;
  start_time: string;
  time_standard: string;
  end_date: string;
}

export interface TraceEvent {
  type: string;
  content?: string;
  rawData?: any;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  responseStartTime?: number;  // optional 필드로 추가
  responseTime?: number;       // optional 필드로 추가
  traces?: TraceEvent[];       // 트레이스 정보 추가
} 