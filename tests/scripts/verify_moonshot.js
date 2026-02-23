const apiKey = "sk-5ipahcLR7y73YfOE5Tlkq39cpcIIcbLcOKlI7G69x7DtVw4b";

fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
            { role: "user", content: "Hi" }
        ]
    })
}).then(async res => {
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}).catch(console.error);
