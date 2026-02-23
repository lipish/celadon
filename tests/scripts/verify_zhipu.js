const apiKey = "00da94a131c4489da8621a6e2ebc69f8.SgKETCXUzFPKGf6S";

fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        model: "glm-4", // Use a valid model
        messages: [
            { role: "user", content: "Hi" }
        ]
    })
}).then(async res => {
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}).catch(console.error);
