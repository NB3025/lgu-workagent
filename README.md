## Install

```
cd ~/
git clone https://github.com/NB3025/lgu-workagent.git
```

## 변수 설정

backend 코드의 S3 Bucket과 Agent ID, ALIAS ID

```python
# ~/lgu-workagent/backend/app.py

S3_BUCKET = 'lgu-workagent-word-templates-9616'
REPORT_PREFIX = 'reports/'

AGENT_ID = "ELYEBDPU3T"
AGENT_ALIAS_ID = "GGNG3XYS6O"
```

frontend 코드의 backend 주소
```js
// ~/lgu-workagent/frontend/src/components/App.tsx
const CHAT_API_URL = "http://localhost:8000";
```



## backend
```bash
cd ~/lgu-workagent/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirement.txt
python app.py
```
## frontend
```bash
cd ~/lgu-workagent/frontend
npm install
npm run dev
```

