from flask import Flask, render_template, request, Response, stream_with_context, jsonify, send_file
import boto3
import json
import uuid
import io
import os
import tempfile
import base64
from typing import Dict, Any
import time
import logging
from datetime import datetime, timedelta
from flask_cors import CORS
import botocore
import re

# 로깅 설정
logger = logging.getLogger(__name__)
# 모든 핸들러 제거
for handler in logger.handlers[:]:
    logger.removeHandler(handler)
# root logger의 핸들러도 제거
root_logger = logging.getLogger()
for handler in root_logger.handlers[:]:
    root_logger.removeHandler(handler)

# 새로운 핸들러 추가
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)
logger.setLevel(logging.INFO)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # 모든 엔드포인트에 CORS 허용

# AWS 클라이언트 설정
bedrock_agent_client = boto3.client('bedrock-agent')
bedrock_agent_runtime_client = boto3.client('bedrock-agent-runtime')
s3 = boto3.client('s3')

# S3 버킷 설정
S3_BUCKET = 'lgu-workagent-word-templates-9616'
REPORT_PREFIX = 'reports/'

AGENT_ID = "ELYEBDPU3T"
AGENT_ALIAS_ID = "GGNG3XYS6O"

# 세션 저장소
sessions = {}

def test_credentials():
    try:
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        print(json.dumps(identity, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}")

def format_trace_event(trace_event: dict) -> str:
    """Bedrock Agent trace 이벤트를 보기 좋게 포맷팅"""
    print (f'{trace_event=}')
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        orchestration_trace = trace_event.get('trace', {}).get('orchestrationTrace', {})
        
        # Trace 타입과 내용 추출
        trace_type = None
        trace_content = None
        trace_id = None
        
        if 'modelInvocationInput' in orchestration_trace:
            trace_type = 'Input'
            input_data = orchestration_trace['modelInvocationInput']
            # print (f'{input_data=}')
            trace_id = input_data.get('traceId', '')
            # messages 배열 추출
            text = input_data.get('text', '')
            messages = input_data.get('messages', [])
                
            trace_content = f"Input: {text}\n" + '\n'.join([
                f"- {msg['role']}: {msg['content']}" 
                for msg in messages
            ])
            
        elif 'modelInvocationOutput' in orchestration_trace:
            trace_type = 'Output'
            output_data = orchestration_trace['modelInvocationOutput']
            # print (f'{output_data=}')
            trace_id = output_data.get('traceId', '')
            
            # rawResponse에서 content 추출
            try:
                raw_response = json.loads(output_data['rawResponse']['content'])
            except:
                print (f'[modelInvocationOutput] json.loads 처리 중 오류 발생')
                raw_response = output_data['rawResponse']['content']
                
            if 'content' in raw_response:
                for content_item in raw_response['content']:
                    if content_item.get('type') == 'text':
                        trace_content = content_item.get('text', '')
            
            # 토큰 사용량 정보 추가
            if trace_content is None:
                trace_content = ""
                
            if 'metadata' in output_data and 'usage' in output_data['metadata']:
                usage = output_data['metadata']['usage']
                trace_content += f"\n\nToken Usage:\n"
                trace_content += f"- Input Tokens: {usage.get('inputTokens', 0)}\n"
                trace_content += f"- Output Tokens: {usage.get('outputTokens', 0)}"
            
        elif 'rationale' in orchestration_trace:
            trace_type = 'Rationale'
            rationale_data = orchestration_trace['rationale']
            # print (f'{rationale_data=}')
            trace_id = rationale_data.get('traceId', '')
            trace_content = rationale_data.get('text', '')
            
        elif 'observation' in orchestration_trace:
            trace_type = 'Observation'
            observation_data = orchestration_trace['observation']
            # print (f'{observation_data=}')
            trace_id = observation_data.get('traceId', '')
            if 'finalResponse' in observation_data:
                trace_content = observation_data['finalResponse'].get('text', '')
            elif 'actionGroupInvocationOutput' in observation_data:
                trace_content = observation_data['actionGroupInvocationOutput'].get('text', '')

        # 포맷팅된 로그 생성
        formatted_trace = f"""
{'='*80}
[{timestamp}] Trace Event - Type: {trace_type}
TraceId: {trace_id}
{'-'*80}
{trace_content}
{'='*80}
"""
        return formatted_trace
        
    except Exception as e:
        logger.error(f"Trace 포맷팅 중 오류 발생: {str(e)}")
        return str(trace_event)

@app.route('/chat', methods=['POST'])
def chat():
    logger.info("새로운 요청: POST /chat")
    data = request.json
    logger.info(f"요청 데이터: {json.dumps(data, ensure_ascii=False)}")
    
    input_text = data.get('message', '')
    session_id = data.get('sessionId', 'default_session')
    
    if not input_text:
        logger.error("메시지가 없습니다.")
        return jsonify({'error': '메시지가 없습니다.'}), 400
    
    def generate_response():
        max_retries = 5
        retry_delay = 10  # 초
        attempt = 0

        while attempt < max_retries:
            try:
                # Bedrock Agent 호출 (스트리밍 설정 추가)
                agent_response = bedrock_agent_runtime_client.invoke_agent(
                    agentId=AGENT_ID,
                    agentAliasId=AGENT_ALIAS_ID,
                    sessionId=session_id,
                    memoryId=session_id,
                    inputText=input_text,
                    enableTrace=True,
                    streamingConfigurations={
                        'streamFinalResponse': True
                    }
                )
                
                # 스트리밍 응답 처리
                response_text = ""
                for event in agent_response['completion']:
                    
                    if 'chunk' in event:
                        chunk = event['chunk']['bytes'].decode('utf-8')
                        clean_chunk = re.sub(r'<sources>[\s\S]*?<\/sources>', '', chunk)
                        response_text += clean_chunk
                        yield f"data: {json.dumps({'chunk': clean_chunk, 'done': False})}\n\n"
                    
                    elif 'trace' in event:
                        formatted_trace = format_trace_event(event['trace'])
                        # 트레이스 이벤트를 프론트엔드로 전송
                        yield f"data: {json.dumps({'trace': event['trace'], 'done': False})}\n\n"
                
                # <sources> 태그 제거 (최종 응답에서도 한번 더 확인)
                clean_response = re.sub(r'<sources>[\s\S]*?<\/sources>', '', response_text)
                yield f"data: {json.dumps({'chunk': '', 'done': True, 'fullResponse': clean_response})}\n\n"
                break  
                
            except botocore.exceptions.EventStreamError as e:
                attempt += 1
                if attempt < max_retries:
                    logger.warning(f"EventStreamError 발생, {attempt}번째 재시도 중... Error: {str(e)}")
                    time.sleep(retry_delay)
                    continue
                else:
                    logger.error(f"최대 재시도 횟수({max_retries})를 초과했습니다. Error: {str(e)}")
                    yield f"data: {json.dumps({'error': '서비스 일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'})}\n\n"
                    break
                    
            except Exception as e:
                logger.error(f"스트리밍 중 오류 발생: {str(e)}", exc_info=True)
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                break
    
    return Response(
        stream_with_context(generate_response()),
        mimetype='text/event-stream'
    )

def save_temp_file(file_content, extension='.docx'):
    """파일 내용을 임시 파일로 저장"""
    fd, temp_path = tempfile.mkstemp(suffix=extension)
    os.close(fd)
    with open(temp_path, 'wb') as f:
        f.write(file_content)
    return temp_path

@app.before_request
def before_request():
    """요청 처리 전 로깅"""
    logger.info(f"새로운 요청: {request.method} {request.path}")

@app.after_request
def after_request(response):
    """요청 처리 후 로깅"""
    logger.info(f"요청 처리 완료: {response.status}")
    return response

# 세션 정리 함수
def cleanup_old_sessions():
    current_time = datetime.now()
    expired_sessions = [
        session_id for session_id, session in sessions.items()
        if current_time - session['last_accessed'] > timedelta(hours=1)
    ]
    for session_id in expired_sessions:
        del sessions[session_id]

if __name__ == '__main__':
    logger.info("Flask 애플리케이션 시작")
    test_credentials()
    app.run(host='0.0.0.0', port=8000, debug=True)