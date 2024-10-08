### Local Deployment
1. Set the environment variable in the .env file
```bash
export DIFY_API_URL=
```

2. Install dependencies 
```bash
yarn
```

3. Run the project
```bash
npm run start
```



## Usage
1. OpenAI Clients


![botgem](pictures/usage.png)

2. Code

```JavaScript
const response = await fetch('http://localhost:3000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_DFIY_API_KEY',
  },
  body: JSON.stringify({
    model: 'dify',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' },
    ],
  }),
});

const data = await response.json();
console.log(data);
```
## Environment Variable
This project provides some additional configuration items set with environment variables:

| Environment Variable | Required | Description                                                                                                                                                               | Example                                                                                                              |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `DIFY_API_URL`     | Yes      | Your Dify API if you self-host it                                                                                                                  | `https://api.dify.ai/v1`                                                                                                 |
| `BOT_TYPE`     | Yes      | The type of your dify bots                                                                                                                  | `Chat,Completion,Workflow`                                                                                                 |
| `INPUT_VARIABLE`     | No      | The name of input variable in your own dify workflow bot                                                                                                                  | `query,text`                                                                                                 |
| `OUTPUT_VARIABLE`     | No      | The name of output variable in your own dify workflow bot                                                                                                                  | `text`                                                                                                 |
## Roadmap
**Coming Soon**
*   Image support
*   Audio-to-text
*   Text-to-audio
*   Docker support

**Available Now**
*   Workflow Bot
*   Variables support
*   Continuous dialogue
*   Zeabur & Vercel deployment
*   Streaming & Blocking
*   Agent & Chat bots

## Contact
Feel free to reach out for any questions or feedback

[X](https://sum4all.site/twitter)\
[telegram](https://sum4all.site/telegram)

<a href="https://www.buymeacoffee.com/fatwang2" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## License
This project is licensed under the MIT License.
