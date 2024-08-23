import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const difyUrl = process.env.DIFY_API_URL || '';

if (!difyUrl) throw new Error("DIFY API URL is required.");

function generateId() {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 29; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const app = express();

app.use(bodyParser.json());
let botType = process.env.BOT_TYPE || 'Chat';
const inputVariable = process.env.INPUT_VARIABLE || '';
const outputVariable = process.env.OUTPUT_VARIABLE || '';

let apiPath;

const apiUrl = difyUrl;
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization",
  "Access-Control-Max-Age": "86400",
};

app.use((req, res, next) => {
  res.set(corsHeaders);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  console.log('Request Method:', req.method); 
  console.log('Request Path:', req.path);
  next();
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>DIFY2OPENAI</title>
      </head>
      <body>
        <h1>Dify2OpenAI</h1>
        <p>Congratulations! Your project has been successfully deployed.</p>
      </body>
    </html>
  `);
});

app.get('/v1/chat/completions', (req, res) => {
  console.log('get chat/completions')
  res.send(`
    <html>
      <head>
        <title>DIFY2OPENAI</title>
      </head>
      <body>
        <h1>Dify2OpenAI</h1>
        <p>Congratulations! Your project has been successfully deployed.</p>
      </body>
    </html>
  `);
});



app.post("/v1/chat/completions", async (req, res) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader) {
    return res.status(401).json({
      code: 401,
      errmsg: "Unauthorized.",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      code: 401,
      errmsg: "Unauthorized.",
    });
  }

  try {
    const data = req.body;
    const messages = data.messages;
    if (data.model === "gpt-4o" || data.model === "gpt-4") {
      apiPath = '/chat-messages';
      botType = 'Chat';
    } else {
      apiPath = '/workflows/run';
      botType = 'Workflow';
    }
    

    let queryString;
    if (botType === 'Chat') {
      const lastMessage = messages[messages.length - 1];
      queryString = `这是我们谈话历史:\n'''\n${messages
        .slice(0, -1)
        .map((message) => `${message.role}: ${message.content}`)
        .join('\n')}\n'''\n\n这是我的问题:\n${lastMessage.content}`;
      console.log('lastMessage', lastMessage, '\n\n')
      console.log('messages[messages.length - 1]', messages[messages.length - 1], '\n\n')
    } else if (botType === 'Completion' || botType === 'Workflow') {
      queryString = messages[messages.length - 1].content;
    }
    console.log('messages', messages, '\n\n')


    const stream = data.stream !== undefined ? data.stream : false;
    let requestBody;
    if (botType === 'Workflow') {
      requestBody = {
        inputs: { "complete_code": queryString },
        response_mode: "streaming",
        conversation_id: "",
        user: "apiuser",
        auto_generate_name: false
      };
    } else {
      requestBody = {
        "inputs": {},
        query: queryString,
        response_mode: "streaming",
        conversation_id: "",
        user: "apiuser",
        auto_generate_name: false
      };
    }
    console.log('fetch');

    const resp = await fetch(difyUrl + apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authHeader.split(" ")[1]}`,
      },
      body: JSON.stringify(requestBody),
    });

    let isResponseEnded = false;

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      const stream = resp.body;
      let buffer = "";
      let isFirstChunk = true;
      console.log('stream on');

      stream.on("data", (chunk) => {
        buffer += chunk.toString();
        
        let lines = buffer.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          let line = lines[i].trim();

          if (!line.startsWith("data:")) continue;
          line = line.slice(5).trim();
          let chunkObj;
          try {
            if (line.startsWith("{")) {
              chunkObj = JSON.parse(line);
            } else {
              continue;
            }
          } catch (error) {
            console.error("Error parsing chunk:", error);
            continue;
          }

          if (chunkObj.event === "message" || chunkObj.event === "agent_message" || chunkObj.event === "text_chunk") {
            let chunkContent;
            if (chunkObj.event === "text_chunk") {
              chunkContent = chunkObj.data.text;
            } else {
              chunkContent = chunkObj.answer;
            }

            if (isFirstChunk) {
              chunkContent = chunkContent.trimStart();
              isFirstChunk = false;
            }


            if (chunkContent !== "") {
              const chunkId = `chatcmpl-${Date.now()}`;
              const chunkCreated = chunkObj.created_at;

              if (!isResponseEnded) {
                res.write(
                  "data: " +
                  JSON.stringify({
                    id: chunkId,
                    object: "chat.completion.chunk",
                    created: chunkCreated,
                    model: data.model,
                    choices: [
                      {
                        index: 0,
                        delta: {
                          content: chunkContent,
                        },
                        finish_reason: null,
                      },
                    ],
                  }) +
                  "\n\n"
                );
              }
            }
          } else if (chunkObj.event === "workflow_finished" || chunkObj.event === "message_end") {
            const chunkId = `chatcmpl-${Date.now()}`;
            const chunkCreated = chunkObj.created_at;
            if (!isResponseEnded) {
              res.write(
                "data: " +
                JSON.stringify({
                  id: chunkId,
                  object: "chat.completion.chunk",
                  created: chunkCreated,
                  model: data.model,
                  choices: [
                    {
                      index: 0,
                      delta: {},
                      finish_reason: "stop",
                    },
                  ],
                }) +
                "\n\n"
              );
            }
            if (!isResponseEnded) {
              res.write("data: [DONE]\n\n");
            }
            res.end();
            isResponseEnded = true;
          } else if (chunkObj.event === "agent_thought") {
            // Handle agent thought event
          } else if (chunkObj.event === "ping") {
            // Handle ping event
          } else if (chunkObj.event === "error") {
            console.error(`Error: ${chunkObj.code}, ${chunkObj.message}`);
            res.status(500).write(`data: ${JSON.stringify({ error: chunkObj.message })}\n\n`);
            if (!isResponseEnded) {
              res.write("data: [DONE]\n\n");
            }
            res.end();
            isResponseEnded = true;
          }
        }

        buffer = lines[lines.length - 1];
        const generateId = generateId()
        console.log(generateId, 'generateId')
      });
    } else {
      let result = "";
      let usageData = "";
      let hasError = false;
      let messageEnded = false;
      let buffer = "";
      let skipWorkflowFinished = false;

      const stream = resp.body;
      stream.on("data", (chunk) => {
        buffer += chunk.toString();
        let lines = buffer.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line === "") continue;
          let chunkObj;
          try {
            const cleanedLine = line.replace(/^data: /, "").trim();
            if (cleanedLine.startsWith("{") && cleanedLine.endsWith("}")) {
              chunkObj = JSON.parse(cleanedLine);
            } else {
              continue;
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
            continue;
          }

          if (chunkObj.event === "message" || chunkObj.event === "agent_message") {
            result += chunkObj.answer;
            skipWorkflowFinished = true;
          } else if (chunkObj.event === "message_end") {
            messageEnded = true;
            usageData = {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            };
          } else if (chunkObj.event === "workflow_finished") {
            if (!skipWorkflowFinished) {
              result += chunkObj.output.content;
            }
            messageEnded = true;
          } else if (chunkObj.event === "error") {
            console.error(`Error: ${chunkObj.code}, ${chunkObj.message}`);
            res.status(500).json({ error: chunkObj.message });
            hasError = true;
          }
        }

        buffer = lines[lines.length - 1];
      });

      stream.on("end", () => {
        if (!hasError) {
          res.json({
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion",
            created: Date.now(),
            model: data.model,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: result,
                },
                finish_reason: messageEnded ? "stop" : null,
              },
            ],
            usage: usageData,
          });
        }
      });
    }
  } catch (error) {
    console.error("Error occurred during request:", error);
    res.status(500).json({
      code: 500,
      errmsg: "Internal server error.",
    });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server is running on port ${process.env.PORT || 3001}`);
});
