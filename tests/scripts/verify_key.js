const apiKey = "sk-a2f0c4777e874a91888002e62a5b5372";

fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        model: "deepseek-reasoner",
        messages: [
            { role: "user", content: "Hi" }
        ]
    })
}).then(async res => {
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}).catch(console.error);
