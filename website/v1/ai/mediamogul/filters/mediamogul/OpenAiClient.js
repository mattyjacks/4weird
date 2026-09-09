.pragma library

// OpenAiClient.js - MediaMogul Shotcut OpenAI API Integration Client
// Communicates with OpenAI REST endpoints using Qt Quick XMLHttpRequest

function parseErrorMessage(xhr) {
    try {
        var response = JSON.parse(xhr.responseText);
        if (response && response.error && response.error.message) {
            return response.error.message;
        }
    } catch (e) {
        // Not JSON
    }
    if (xhr.status === 401) {
        return "Invalid or unauthorized API key. Check your OpenAI API key in the Settings tab.";
    } else if (xhr.status === 429) {
        return "Rate limit reached or insufficient quota. Check your OpenAI account billing/credits.";
    } else if (xhr.status === 0) {
        return "Network connection error or timeout. Check your internet connection.";
    }
    return "HTTP " + xhr.status + ": " + (xhr.statusText || "Request failed");
}

function testApiKey(apiKey, callback) {
    if (!apiKey || apiKey.trim() === "") {
        callback(new Error("API key cannot be empty."), false, "API key is required.");
        return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.openai.com/v1/models");
    xhr.setRequestHeader("Authorization", "Bearer " + apiKey.trim());
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 15000;

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
                callback(null, true, "Connection successful! API key is verified.");
            } else {
                var msg = parseErrorMessage(xhr);
                callback(new Error(msg), false, msg);
            }
        }
    };

    xhr.ontimeout = function() {
        callback(new Error("Connection timed out."), false, "Request timed out after 15 seconds.");
    };

    xhr.onerror = function() {
        callback(new Error("Network error."), false, "Could not reach OpenAI API.");
    };

    try {
        xhr.send();
    } catch (err) {
        callback(err, false, "Failed to send request: " + err.message);
    }
}

function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 3.8);
}

function countMessageTokens(messages) {
    if (!messages || !Array.isArray(messages)) return 0;
    var total = 0;
    for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        total += 4;
        if (m.content) {
            total += estimateTokens(m.content);
        }
    }
    return total + 3;
}

function pruneSlidingContext(messages, maxContextTokens) {
    if (!messages || messages.length <= 1) return messages || [];
    var limit = (typeof maxContextTokens === "number" && maxContextTokens > 500) ? maxContextTokens : 8192;
    var pruned = messages.slice();
    var currentTokens = countMessageTokens(pruned);

    // Keep system prompt at pruned[0], remove oldest history items until within limit
    while (currentTokens > limit && pruned.length > 2) {
        pruned.splice(1, 1);
        currentTokens = countMessageTokens(pruned);
    }
    return pruned;
}

function chatConversation(apiKey, model, messages, temperature, maxTokens, maxContextTokens, callback) {
    if (!apiKey || apiKey.trim() === "") {
        callback(new Error("OpenAI API key is missing. Enter your key in the 'Settings' tab."));
        return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        callback(new Error("Conversation messages cannot be empty."));
        return;
    }

    // Apply sliding context window pruning
    var prunedMessages = pruneSlidingContext(messages, maxContextTokens);

    var payload = {
        model: model || "gpt-5.6-luna",
        messages: prunedMessages,
        temperature: (typeof temperature === "number") ? temperature : 0.7,
        max_tokens: (typeof maxTokens === "number" && maxTokens > 0) ? maxTokens : 800
    };

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.openai.com/v1/chat/completions");
    xhr.setRequestHeader("Authorization", "Bearer " + apiKey.trim());
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 60000;

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
                        var text = response.choices[0].message.content.trim();
                        var usage = response.usage || {
                            prompt_tokens: countMessageTokens(prunedMessages),
                            completion_tokens: estimateTokens(text),
                            total_tokens: countMessageTokens(prunedMessages) + estimateTokens(text)
                        };
                        callback(null, text, usage, prunedMessages);
                    } else {
                        callback(new Error("No completion choices returned by OpenAI."));
                    }
                } catch (e) {
                    callback(new Error("Failed to parse OpenAI response: " + e.message));
                }
            } else {
                callback(new Error(parseErrorMessage(xhr)));
            }
        }
    };

    xhr.ontimeout = function() {
        callback(new Error("Request timed out after 60 seconds."));
    };

    xhr.onerror = function() {
        callback(new Error("Network error connecting to OpenAI API."));
    };

    try {
        xhr.send(JSON.stringify(payload));
    } catch (err) {
        callback(err);
    }
}

function chatCompletion(apiKey, model, systemPrompt, userPrompt, temperature, maxTokens, callback) {
    var messages = [
        {
            role: "system",
            content: systemPrompt || "You are MediaMogul, an expert video editor AI. Generate concise, punchy text for video graphics without quotes or markdown formatting."
        },
        {
            role: "user",
            content: userPrompt
        }
    ];

    chatConversation(apiKey, model, messages, temperature, maxTokens, 8192, function(err, text, usage) {
        if (err) {
            callback(err);
            return;
        }
        // Clean up quotes if present
        var cleaned = text;
        cleaned = cleaned.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
        }
        callback(null, cleaned, usage);
    });
}

function generateImage(apiKey, prompt, size, quality, style, callback) {
    if (!apiKey || apiKey.trim() === "") {
        callback(new Error("OpenAI API key is missing. Enter your key in the 'Settings' tab."));
        return;
    }

    if (!prompt || prompt.trim() === "") {
        callback(new Error("Image prompt cannot be empty."));
        return;
    }

    var payload = {
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: size || "1792x1024", // 16:9 cinematic landscape for video
        quality: quality || "standard",
        style: style || "vivid",
        response_format: "url"
    };

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.openai.com/v1/images/generations");
    xhr.setRequestHeader("Authorization", "Bearer " + apiKey.trim());
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 75000;

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.data && response.data.length > 0) {
                        var imgUrl = response.data[0].url;
                        var revised = response.data[0].revised_prompt || prompt;
                        callback(null, imgUrl, revised);
                    } else {
                        callback(new Error("No image data returned by DALL-E."));
                    }
                } catch (e) {
                    callback(new Error("Failed to parse image response: " + e.message));
                }
            } else {
                callback(new Error(parseErrorMessage(xhr)));
            }
        }
    };

    xhr.ontimeout = function() {
        callback(new Error("DALL-E generation timed out after 75 seconds."));
    };

    xhr.onerror = function() {
        callback(new Error("Network error connecting to DALL-E API."));
    };

    try {
        xhr.send(JSON.stringify(payload));
    } catch (err) {
        callback(err);
    }
}
