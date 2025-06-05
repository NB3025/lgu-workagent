'use client';

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, RefreshCw, FileText, Brain, Code, Info, Database, FileDown } from "lucide-react";
import { type Message, type TraceEvent } from '../types';
import Image from "next/image";

// API Base URL 설정을 상수로 분리
// const CHAT_API_URL = "https://dm9cmsssdpup2.cloudfront.net";
// const CHAT_API_URL = "https://ipv9mwmq5q.us-east-1.awsapprunner.com";
const CHAT_API_URL = "http://localhost:8000";
// 초기 메시지를 상수로 분리
const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "고객님, 안녕하세요.\n무엇을 도와드릴까요?",
  timestamp: Date.now()
};

// 상담원 정보를 상수로 정의
const AGENT_INFO = {
  name: "홀맨",
  image: "/callman.png"
};

const formatMessage = (content: string) => {
  // <sources> 태그와 내용 제거
  const cleanedContent = content.replace(/<sources>[\s\S]*?<\/sources>/g, '');
  
  // 줄바꿈 처리
  const lines = cleanedContent.split('\n');
  return lines.map((line, index) => (
    <React.Fragment key={index}>
      {/* 빈 줄은 추가 여백을 줌 */}
      {line.trim() === '' ? <br /> : line}
      {index < lines.length - 1 && <br />}
    </React.Fragment>
  ));
};

// MessageTime 컴포넌트 수정
const MessageTime = ({ 
  timestamp, 
  responseTime,
  responseStartTime 
}: { 
  timestamp: number;
  responseTime?: number;
  responseStartTime?: number;
}) => {
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    setFormattedTime(
      new Date(timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    );
  }, [timestamp]);

  return (
    <div className="text-xs mt-1 space-y-1">
      <p className="opacity-70">{formattedTime}</p>
      {responseStartTime && (
        <p className="text-blue-500">
          응답 시작: {(responseStartTime / 1000).toFixed(2)}초
        </p>
      )}
      {responseTime && (
        <p className="text-green-500">
          총 응답 시간: {responseTime.toFixed(2)}초
        </p>
      )}
    </div>
  );
};

// 각 Trace 아이템을 위한 컴포넌트
const TraceItem = ({ trace }: { trace: TraceEvent }) => {
  // 아이콘 선택
  let Icon = Info;
  if (trace.type === 'Rationale') Icon = Brain;
  else if (trace.type === 'Input' || trace.type === 'Output') Icon = MessageCircle;
  else if (trace.type === 'codeInterpreter') Icon = Code;
  else if (trace.type === 'knowledgeBase') Icon = Database;
  
  // 컨텐츠 길이 제한 (너무 길면 접을 수 있게)
  const maxDisplayLength = 300;
  const content = trace.content || '';
  const isLongContent = content.length > maxDisplayLength;
  const [isExpanded, setIsExpanded] = useState(false);
  const displayContent = isExpanded ? content : content.substring(0, maxDisplayLength) + (isLongContent ? '...' : '');
  
  return (
    <div className="bg-indigo-50 rounded p-2 text-xs border border-indigo-200 mb-2">
      <div className="font-medium flex items-center text-indigo-800 mb-1 border-b border-indigo-100 pb-1">
        <Icon className="w-3 h-3 mr-1" />
        <span>{trace.type}</span>
      </div>
      <div className="whitespace-pre-wrap text-gray-700">{displayContent}</div>
      {isLongContent && (
        <button 
          className="text-indigo-600 mt-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '접기' : '더 보기'}
        </button>
      )}
    </div>
  );
};

// TraceInfo 컴포넌트 추가
const TraceInfo = ({ traces }: { traces?: TraceEvent[] }) => {
  if (!traces || traces.length === 0) return null;
  
  // 지정된 타입의 트레이스만 표시 (Rationale, knowledgeBase, Observation)
  const allowedTypes = ['Rationale', 'knowledgeBase', 'Observation'];
  const filteredTraces = traces.filter(trace => allowedTypes.includes(trace.type));
  
  if (filteredTraces.length === 0) return null;
  
  return (
    <div className="mt-3 border-t border-indigo-200 pt-3 bg-indigo-50 p-2 rounded-lg">
      <div className="text-sm font-semibold mb-2 flex items-center text-indigo-800">
        <Brain className="w-4 h-4 mr-1" />
        <span>LLM 처리 과정</span>
      </div>
      <div className="space-y-2">
        {filteredTraces.map((trace, index) => (
          <TraceItem key={index} trace={trace} />
        ))}
      </div>
    </div>
  );
};

// Message 컴포넌트 추가
const MessageBubble = ({ message }: { message: Message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-blue-500 text-white rounded-lg p-3 max-w-[70%]">
          <p className="whitespace-pre-wrap">{formatMessage(message.content)}</p>
          <MessageTime 
            timestamp={message.timestamp}
            responseStartTime={message.responseStartTime}
            responseTime={message.responseTime}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start mb-6">
      <div className="flex items-center mb-2">
        <span className="text-sm text-gray-600">{AGENT_INFO.name}</span>
      </div>
      <div className="rounded-lg p-0 max-w-[80%] shadow-sm">
        {/* 먼저 LLM 처리 과정 표시 */}
        <TraceInfo traces={message.traces} />
        
        {/* 그 다음 메시지 내용 표시 */}
        <div className="bg-white rounded-lg p-3 mt-2 border border-gray-200">
          <p className="whitespace-pre-wrap font-medium text-gray-800">{formatMessage(message.content)}</p>
          <MessageTime 
            timestamp={message.timestamp}
            responseStartTime={message.responseStartTime}
            responseTime={message.responseTime}
          />
        </div>
      </div>
    </div>
  );
};

// 유니코드 디코딩 함수 추가
const decodeUnicodeText = (text: string): string => {
  try {
    // 유니코드 이스케이프 시퀀스 (\uXXXX) 디코딩
    const decoded = text.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
      return String.fromCharCode(parseInt(code, 16));
    });
    
    // HTML 엔티티 디코딩
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = decoded;
    return tempDiv.textContent || tempDiv.innerText || decoded;
  } catch (error) {
    console.error('유니코드 디코딩 오류:', error);
    return text;
  }
};

export default function App() {
  // 모든 hooks를 컴포넌트 최상단에 선언
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  // 보고서 관련 상태 추가
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [isCheckingReport, setIsCheckingReport] = useState(false);
  const [reportPreviewUrl, setReportPreviewUrl] = useState<string | null>(null);
  // 채팅 시작 여부 추적을 위한 상태 추가
  const [isChatStarted, setIsChatStarted] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 보고서 다운로드
  const downloadReport = () => {
    if (reportUrl) {
      // 새 탭에서 열기
      window.open(reportUrl, '_blank');
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 세션 ID 초기화 및 DynamoDB에 저장
  useEffect(() => {
    const savedSessionId = localStorage.getItem('chatSessionId');
    const savedSessionTimestamp = localStorage.getItem('chatSessionTimestamp');
    
    const isSessionValid = savedSessionId && savedSessionTimestamp && 
      (Date.now() - Number(savedSessionTimestamp)) < (3600 * 1000);

    let currentSessionId;
    if (isSessionValid) {
      currentSessionId = savedSessionId;
      setSessionId(savedSessionId);
    } else {
      currentSessionId = crypto.randomUUID();
      setSessionId(currentSessionId);
      localStorage.setItem('chatSessionId', currentSessionId);
      localStorage.setItem('chatSessionTimestamp', Date.now().toString());
    }

  }, []);

  const processTraceEvent = (event: any): TraceEvent | null => {
    if (!event || !event.trace || !event.trace.orchestrationTrace) {
      return null;
    }

    const trace = event.trace.orchestrationTrace;
    let traceEvent: TraceEvent | null = null;

    // Rationale (사고 과정)
    if (trace.rationale) {
      traceEvent = {
        type: 'Rationale',
        content: decodeUnicodeText(trace.rationale.text || ''),
        rawData: trace.rationale
      };
    }
    // Model Input (모델 입력)
    else if (trace.modelInvocationInput) {
      const inputData = trace.modelInvocationInput;
      try {
        let content = '';
        if (inputData.text) {
          const text = typeof inputData.text === 'string' ? inputData.text : JSON.stringify(inputData.text, null, 2);
          content = `Input: ${decodeUnicodeText(text)}`;
        }
        traceEvent = {
          type: 'Input',
          content,
          rawData: inputData
        };
      } catch (e) {
        console.error('Error parsing model input:', e);
      }
    }
    // Model Output (모델 출력)
    else if (trace.modelInvocationOutput) {
      const outputData = trace.modelInvocationOutput;
      try {
        let content = '';
        if (outputData.rawResponse && outputData.rawResponse.content) {
          const responseContent = outputData.rawResponse.content;
          
          // <thinking></thinking> 태그 사이의 내용 추출
          const thinkingMatch = /<thinking>([\s\S]*?)<\/thinking>/g.exec(responseContent);
          
          // <answer> 태그 이후의 내용 추출 (JSON 형식 처리)
          const answerRegex = /<answer>([\s\S]*?)$/;
          const answerMatch = answerRegex.exec(responseContent);
          
          // JSON 형식의 응답인지 확인 및 처리
          let jsonContent = null;
          try {
            if (responseContent.trim().startsWith('{')) {
              const jsonObj = JSON.parse(responseContent);
              if (jsonObj.content && Array.isArray(jsonObj.content)) {
                // JSON 객체 내 text 필드 탐색
                for (const item of jsonObj.content) {
                  if (item.type === 'text' && item.text) {
                    // text 필드 내 <answer> 태그 처리
                    const textAnswerMatch = answerRegex.exec(item.text);
                    if (textAnswerMatch && textAnswerMatch[1]) {
                      jsonContent = decodeUnicodeText(textAnswerMatch[1].trim());
                      break;
                    } else {
                      jsonContent = decodeUnicodeText(item.text);
                    }
                  }
                }
              }
            }
          } catch (jsonError) {
            console.log('Not a valid JSON or unexpected format:', jsonError);
          }
          
          // 추출된 내용 우선순위: JSON 내 <answer> > 일반 <answer> > <thinking> > 원본
          if (jsonContent) {
            content = `AI의 응답:\n${jsonContent}`;
          } else if (answerMatch && answerMatch[1]) {
            content = `AI의 응답:\n${decodeUnicodeText(answerMatch[1].trim())}`;
          } else if (thinkingMatch && thinkingMatch[1]) {
            content = `AI의 사고 과정:\n${decodeUnicodeText(thinkingMatch[1].trim())}`;
          } else {
            // thinking 태그나 answer 태그가 없는 경우
            content = `Output: ${decodeUnicodeText(responseContent)}`;
          }
        }
        
        // 토큰 사용량 정보 추가
        if (outputData.metadata && outputData.metadata.usage) {
          const usage = outputData.metadata.usage;
          content += `\n\nToken Usage:\n- Input Tokens: ${usage.inputTokens || 0}\n- Output Tokens: ${usage.outputTokens || 0}`;
        }
        
        traceEvent = {
          type: 'Output',
          content,
          rawData: outputData
        };
      } catch (e) {
        console.error('Error parsing model output:', e);
      }
    }
    // 코드 실행
    else if (trace.invocationInput && trace.invocationInput.codeInterpreterInvocationInput) {
      const codeData = trace.invocationInput.codeInterpreterInvocationInput;
      traceEvent = {
        type: 'codeInterpreter',
        content: `코드 실행: \n${decodeUnicodeText(codeData.code || '')}`,
        rawData: codeData
      };
    }
    // 지식베이스 검색
    else if (trace.invocationInput && trace.invocationInput.knowledgeBaseLookupInput) {
      const kbData = trace.invocationInput.knowledgeBaseLookupInput;
      traceEvent = {
        type: 'knowledgeBase',
        content: `지식베이스 검색: ${decodeUnicodeText(kbData.text || '')}`,
        rawData: kbData
      };
    }
    // 액션 그룹 실행
    else if (trace.invocationInput && trace.invocationInput.actionGroupInvocationInput) {
      const actionData = trace.invocationInput.actionGroupInvocationInput;
      const functionText = actionData.function || JSON.stringify(actionData);
      traceEvent = {
        type: 'actionGroup',
        content: `함수 호출: ${decodeUnicodeText(functionText)}`,
        rawData: actionData
      };
    }
    // 관찰 결과
    else if (trace.observation) {
      const obsData = trace.observation;
      let content = '';
      
      if (obsData.finalResponse) {
        content = `최종 응답: ${decodeUnicodeText(obsData.finalResponse.text || '')}`;
      } else if (obsData.codeInterpreterInvocationOutput) {
        if (obsData.codeInterpreterInvocationOutput.executionOutput) {
          content = `코드 실행 결과: ${decodeUnicodeText(obsData.codeInterpreterInvocationOutput.executionOutput)}`;
        } else if (obsData.codeInterpreterInvocationOutput.executionError) {
          content = `코드 실행 오류: ${decodeUnicodeText(JSON.stringify(obsData.codeInterpreterInvocationOutput.executionError))}`;
        }
      } else if (obsData.knowledgeBaseLookupOutput) {
        const refs = obsData.knowledgeBaseLookupOutput.retrievedReferences || [];
        content = `검색 결과: ${refs.length}개의 문서가 검색되었습니다.`;
      } else if (obsData.actionGroupInvocationOutput) {
        content = `함수 실행 결과: ${decodeUnicodeText(obsData.actionGroupInvocationOutput.text || '')}`;
      }
      
      traceEvent = {
        type: 'Observation',
        content,
        rawData: obsData
      };
    }
    // 가드레일 검사 결과
    else if (event.trace.guardrailTrace) {
      const guardData = event.trace.guardrailTrace;
      let content = '가드레일 검사 결과:';
      
      if (guardData.inputAssessments) {
        for (const assessment of guardData.inputAssessments) {
          if (assessment.contentPolicy) {
            for (const filter of assessment.contentPolicy.filters || []) {
              if (filter.action === 'BLOCKED') {
                content += `\n- ${filter.type} 차단됨 (신뢰도: ${filter.confidence})`;
              }
            }
          }
          if (assessment.topicPolicy) {
            for (const topic of assessment.topicPolicy.topics || []) {
              if (topic.action === 'BLOCKED') {
                content += `\n- 주제 '${topic.name}' 차단됨`;
              }
            }
          }
        }
      }
      
      traceEvent = {
        type: 'Guardrail',
        content: decodeUnicodeText(content),
        rawData: guardData
      };
    }

    return traceEvent;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // 첫 메시지를 보내면 채팅 시작으로 간주
    if (!isChatStarted) {
      setIsChatStarted(true);
    }
    
    const startTime = Date.now();
    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: startTime
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${CHAT_API_URL}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'text/event-stream; charset=utf-8'
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let accumulatedResponse = '';
      let responseStarted = false;
      let responseStartTime = 0;
      let traces: TraceEvent[] = [];
      
      // 불완전한 JSON 라인을 저장할 버퍼
      let lineBuffer = '';
      
      let assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        traces: []
      };

      // 메시지 배열에 빈 assistant 메시지 추가
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // UTF-8로 명시적 디코딩
        const chunk = new TextDecoder('utf-8').decode(value, { stream: true });
        
        // 이전 버퍼와 현재 청크를 합침
        const fullChunk = lineBuffer + chunk;
        const lines = fullChunk.split('\n');
        
        // 마지막 줄은 불완전할 수 있으므로 버퍼에 저장
        lineBuffer = lines.pop() || '';
        
        // 완전한 줄들만 처리
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonString = line.slice(6).trim();
            
            // 빈 문자열이면 건너뛰기
            if (!jsonString) continue;
            
            // JSON 완전성 검사
            if (!isValidJsonString(jsonString)) {
              console.warn('Incomplete JSON detected, skipping:', jsonString.substring(0, 100) + '...');
              continue;
            }
            
            try {
              const data = JSON.parse(jsonString);
              
              if (data.error) {
                throw new Error(data.error);
              }

              // 청크 처리 - 유니코드 디코딩 적용
              if (data.chunk) {
                if (!responseStarted) {
                  responseStarted = true;
                  responseStartTime = Date.now() - startTime;
                }
                
                // 유니코드 디코딩 적용
                const decodedChunk = decodeUnicodeText(data.chunk);
                accumulatedResponse += decodedChunk;
                
                // 실시간으로 메시지 업데이트
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage.role === 'assistant') {
                    lastMessage.content = accumulatedResponse;
                    lastMessage.responseStartTime = responseStartTime;
                    if (traces.length > 0) {
                      lastMessage.traces = [...traces];
                    }
                  }
                  return newMessages;
                });
              }

              // 트레이스 처리
              if (data.trace) {
                const traceEvent = processTraceEvent(data.trace);
                if (traceEvent) {
                  traces.push(traceEvent);
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                      lastMessage.traces = [...traces];
                    }
                    return newMessages;
                  });
                }
              }

              // 완료 처리 - 유니코드 디코딩 적용
              if (data.done) {
                const endTime = Date.now();
                const responseTime = (endTime - startTime) / 1000;
                
                // 최종 응답도 유니코드 디코딩 적용
                const finalResponse = data.fullResponse ? decodeUnicodeText(data.fullResponse) : accumulatedResponse;
                
                // 최종 메시지 업데이트
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage.role === 'assistant') {
                    lastMessage.content = finalResponse;
                    lastMessage.responseStartTime = responseStartTime;
                    lastMessage.responseTime = responseTime;
                    lastMessage.traces = traces;
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
              console.error('Problematic JSON string:', jsonString.substring(0, 200) + '...');
            }
          }
        }
      }

      // 스트림 종료 후 남은 버퍼 처리
      if (lineBuffer.trim() && lineBuffer.startsWith('data: ')) {
        const jsonString = lineBuffer.slice(6).trim();
        if (jsonString && isValidJsonString(jsonString)) {
          try {
            const data = JSON.parse(jsonString);
            if (data.done && data.fullResponse) {
              const finalResponse = decodeUnicodeText(data.fullResponse);
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'assistant') {
                  lastMessage.content = finalResponse;
                }
                return newMessages;
              });
            }
          } catch (e) {
            console.error('Error parsing final buffer:', e);
          }
        }
      }

    } catch (error) {
      console.error('Error:', error);
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다.',
        timestamp: endTime,
        responseTime: responseTime
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // JSON 문자열 완전성 검사 함수 추가
  const isValidJsonString = (str: string): boolean => {
    if (!str.trim()) return false;
    
    try {
      // 간단한 JSON 구조 검사
      let braceCount = 0;
      let inString = false;
      let escaped = false;
      
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        
        if (escaped) {
          escaped = false;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
      }
      
      // 문자열이 닫히지 않았거나 중괄호가 맞지 않으면 불완전한 JSON
      return !inString && braceCount === 0;
    } catch {
      return false;
    }
  };

  // 세션 초기화 함수
  const handleSessionReset = () => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    // 메시지 초기화
    setMessages([{...INITIAL_MESSAGE}]);
    // 보고서 상태 초기화
    setIsReportGenerated(false);
    setReportUrl(null);
    setReportPreviewUrl(null);
    // 채팅 시작 상태 초기화
    setIsChatStarted(false);
    // 로컬 스토리지 업데이트
    localStorage.setItem('chatSessionId', newSessionId);
    localStorage.setItem('chatSessionTimestamp', Date.now().toString());
    
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 최상단 제목 영역 */}
      <div className="p-4 border-b border-gray-200">
        <Image 
          src="/logo.png"
          alt="logo"
          width={200}
          height={80}
          className="rounded-full mr-2"
        />
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 영역 (채팅) */}
        <div className="w-3/5 flex flex-col border-r border-gray-200 overflow-hidden">
          {/* 채팅 헤더 */}
          <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center">
              <MessageCircle className="w-6 h-6 mr-2 text-blue-600" />
              WorkAgent
            </h2>
            <div className="flex items-center">
              <button
                onClick={handleSessionReset}
                className="flex items-center justify-center gap-2 px-3 py-1 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>세션 초기화</span>
              </button>
              <span className="text-xs text-gray-500 ml-2">
                세션 ID: {sessionId.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* 채팅 메시지 영역 - 스크롤 스타일 추가 */}
          <div 
            ref={chatContainerRef} 
            className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            style={{
              height: 'calc(100vh - 190px)', // 헤더와 입력창 높이를 고려한 고정 높이
              scrollBehavior: 'smooth'
            }}
          >
            {/* 초기 환영 메시지 */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="text-center space-y-2">
                <p className="text-xl font-bold">고객님, 안녕하세요.</p>
                <p className="text-lg">무엇을 도와드릴까요?</p>
              </div>
            </div>

            {/* 채팅 메시지들 */}
            {messages.slice(1).map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 메시지 입력 영역 */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
              >
                전송
              </button>
            </div>
          </div>
        </div>

        {/* 우측 영역 (보고서) */}
        <div className="w-2/5 p-4 bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-600" />
              보고서
            </h2>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            {isReportGenerated && reportUrl ? (
              <div className="bg-gray-100 rounded-lg p-4 h-full flex flex-col items-center">
                <div className="mb-4 text-lg font-semibold text-center">
                  보고서가 생성되었습니다!
                </div>
                
                {reportPreviewUrl ? (
                  <div className="w-full h-[70%] border rounded mb-4 overflow-hidden bg-white">
                    <iframe 
                      src={reportPreviewUrl}
                      className="w-full h-full border-none"
                      title="보고서 미리보기"
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : (
                  <div className="w-full h-[70%] border rounded mb-4 flex items-center justify-center bg-white p-4">
                    <div className="text-center space-y-4">
                      <Image 
                        src="/template_img.png"
                        alt="보고서 미리보기"
                        width={320}
                        height={450}
                        className="mx-auto mb-4"
                      />
                      <p className="text-gray-600">보고서 미리보기를 불러오는 중입니다...</p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={downloadReport}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>보고서 다운로드</span>
                </button>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-4 h-full flex flex-col items-center justify-center relative">
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image 
                    src="/template_img.png"
                    alt="보고서 템플릿"
                    fill
                    style={{ objectFit: 'contain', opacity: '0.5' }}
                    className="rounded"
                  />
                  <div className="absolute z-10 text-center px-4">
                    <p className="text-xl font-semibold text-gray-800">
                      채팅 내용을 기반으로 보고서가 작성 될 것입니다.
              </p>
            </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}