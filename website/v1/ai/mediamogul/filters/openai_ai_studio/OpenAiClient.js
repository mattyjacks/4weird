.pragma library

// OpenAiClient.js - Shotcut QML OpenAI API Integration Client
// Communicates with OpenAI REST endpoints using XMLHttpRequest

function parseErrorMessage(xhr) {
    try {
        var response = JSON.parse(xhr.responseText);
        if (response && response.error && response.error.message) {
            return response.error.message;
        }
    } catch (e) {
        // Response was not valid JSON
    }
    if (xhr.status === 401) {
        return "Invalid or unauthorized API key. Please check your OpenAI API key in Settings.";
    } else if (xhr.status === 429) {
        return "Rate limit reached or insufficient quota. Please check your OpenAI account credits.";
    } else if (xhr.status === 0) {
        return "Network error or timeout. Please check your internet connection.";
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
                callback(null, true, "Connection successful! API key is valid.");
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

function chatCompletion(apiKey, model, systemPrompt, userPrompt, temperature, maxTokens, callback) {
    if (!apiKey || apiKey.trim() === "") {
        callback(new Error("API key is missing. Please enter your API key in the Settings tab."));
        return;
    }

    if (!userPrompt || userPrompt.trim() === "") {
        callback(new Error("Prompt cannot be empty."));
        return;
    }

    var payload = {
        model: model || "gpt-5.6-luna",
        messages: [
            {
                role: "system",
                content: systemPrompt || "You are an expert video editor and script writer. Output only the requested text without quotes or markdown explanation unless asked."
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        temperature: (typeof temperature === "number") ? temperature : 0.7,
        max_tokens: maxTokens || 350
    };

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.openai.com/v1/chat/completions");
    xhr.setRequestHeader("Authorization", "Bearer " + apiKey.trim());
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 30000;

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
                        var text = response.choices[0].message.content.trim();
                        callback(null, text, response.usage);
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
        callback(new Error("Request timed out after 30 seconds."));
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

function generateImage(apiKey, prompt, size, quality, style, callback) {
    if (!apiKey || apiKey.trim() === "") {
        callback(new Error("API key is missing. Please enter your API key in the Settings tab."));
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
        size: size || "1792x1024", // 16:9 widescreen default for video
        quality: quality || "standard",
        style: style || "vivid",
        response_format: "url"
    };

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.openai.com/v1/images/generations");
    xhr.setRequestHeader("Authorization", "Bearer " + apiKey.trim());
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 60000; // Image generation can take up to 60s

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
        callback(new Error("Image generation timed out after 60 seconds."));
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
