import { config } from "dotenv";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import line from "@line/bot-sdk";
import { ChatGPTAPI } from "chatgpt";

config();

// create chatGPT
const chatGPT = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY });

// create resopnse storage
let chatGPTconfig = {};

const setChatGPTconfigInit = () => {
  chatGPTconfig = {
    parentMessageId: "",
    systemMessage:
      "你是AI軟體工程師助手，精通前後端技術，你會替我分析我的問題並給我建議與答案，請用繁體中文及台灣用語來回覆。",
    completionParams: {
      temperature: 0.3,
    },
    timeoutMs: 2 * 60 * 1000, // 2 min
  };
};

setChatGPTconfigInit();

// auto clean parentMessageId
let timeoutId = "";
const setCleanParentMessageId = () => {
  timeoutId = setTimeout(() => {
    // clearn
    setChatGPTconfigInit();
  }, 15 * 60 * 1000);
};

// create LINE SDK config from env variables
const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(lineConfig);

// create Express app
const app = express();

// view engine setup
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index", { title: "Hello world!" });
});

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post("/callback", line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// local test
app.use(express.json());
app.post("/test", async (req, res) => {
  const { text } = req.body;
  let data = await handleEvent(text, true);
  res.send(data);
});

// event handler
async function handleEvent(event, isLocal = false) {
  if (!isLocal && (event.type !== "message" || event.message.type !== "text")) {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  let echo = { type: "text", text: "" },
    inputText = isLocal ? event : event.message.text;

  try {
    if (/^\//.test(inputText)) {
      echo.text = await handleCustomCommand(inputText.substring(1));
    } else {
      clearTimeout(timeoutId);
      delete chatGPTconfig.detail;
      const res = await chatGPT.sendMessage(inputText, chatGPTconfig);

      // store res.id in parentMessageId for continue article
      chatGPTconfig.parentMessageId = res.id;

      chatGPTconfig.detail = res.detail;
      if (isLocal) echo.detail = res.detail;

      // create a echoing text message
      echo.text = res.text || "抱歉，我沒有話可說了。";

      if (res.detail.choices[0].finish_reason !== "stop") {
        // add notice when sentence no finish yet
        echo.text += `（ 回答尚未結束，請輸入繼續來完成句子 - finish_reason:${finish_reason}）`;
      }
      setCleanParentMessageId();
    }
  } catch (error) {
    echo.text = error.message;
  }

  if (isLocal) {
    return echo;
  } else {
    // use reply API
    return client.replyMessage(event.replyToken, echo);
  }
}

const commandList = ["/clear", "/status", "/usage", "/command"];

const handleCustomCommand = (command) =>
  new Promise((resolve, reject) => {
    let response;
    switch (command) {
      case "command":
        response = commandList.join("\n");
        break;
      case "clear":
        setChatGPTconfigInit();
        response = "parentMessageId 已清除";
        break;
      case "status":
        response = chatGPTconfig.detail?.choices[0].finish_reason || "無狀態";
        break;
      case "usage":
        if (chatGPTconfig.detail?.usage) {
          response = JSON.stringify(chatGPTconfig.detail.usage)
            .slice(1, -1)
            .replaceAll(",", "\n");
        } else {
          response = "無前一筆資料";
        }
        break;
      default:
        response = "無效的指令操作";
        break;
    }
    resolve(response);
  });

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
