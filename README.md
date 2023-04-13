# Line Bot with ChatGPT

###### tags: `line bot`, `chatGPT`
> 串接 API 前的詳細步驟皆可查看 Reference

## :memo: Where do I start?

### 前置作業
1. 申請OpenAI，取得API keys
2. 申請 Line Developer

### 建立專案
1. 建立本地專案
2. 安裝套件
```
npm i @line/bot-sdk express dotenv
```
3. 撰寫程式碼[官方範例程式碼](https://github.com/line/line-bot-sdk-nodejs/blob/master/examples/echo-bot/index.js)
4. 設置環境變數`.env`
```
CHANNEL_ACCESS_TOKEN=
CHANNEL_SECRET=
OPENAI_API_KEY=
```
5. 上傳到`Github`
6. 部署 Web Server 到 [Render](https://render.com/)
7. 設置 Web Server 環境變數
```
CHANNEL_ACCESS_TOKEN
CHANNEL_SECRET
OPENAI_API_KEY
```

### 加入Line Bot好友
1. 調整Line Bot
2. 關掉預設回饋

### 串接 OpenAI API
1. 安裝套件`chatgpt` 
> - 此套件中`parentMessageId`能夠避免大量傳值接續上下文
> - node 版本需求 >=18
```
npm i chatgpt
```
2. package.json 改寫
> chatgpt 需使用 `import` 方式引入使用
```json!
{
    ...,
    "type": "module",
}
```
3. 編輯 `app.js`
- 新增
```javascript!
import { ChatGPTAPI } from "chatgpt";

// create chatGPT
const chatGPT = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY });

// create id storage
let parentMessageId = "";
```
4. 改寫`handleEvent` 的 input `event.message.text` 以及 output `echo`，並在全域變數`parentMessageId`存取前一次結果`id`
```javascript!
async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  let echo = { type: "text", text: "" };
  try {
    const res = await chatGPT.sendMessage(event.message.text, {
      parentMessageId,
    });

    // store res.id in parentMessageId for continue article
    parentMessageId = res.id;

    // create a echoing text message
    echo = { type: "text", text: res.text || "抱歉，我沒有話可說了。" };
  } catch (error) {
    echo = { type: "text", text: error.message };
  }
  // use reply API
  return client.replyMessage(event.replyToken, echo);
}
```
4. 上傳發布

## Reference
[用 Node.js 建立你的第一個 LINE Bot 聊天機器人以 OpenAI GPT-3 與 GPT-3.5 為例](https://israynotarray.com/nodejs/20221210/1224824056/)

