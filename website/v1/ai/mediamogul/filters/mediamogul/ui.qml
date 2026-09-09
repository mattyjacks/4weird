/*
 * MediaMogul - OpenAI AI Studio for Shotcut
 * Video Filter powered by OpenAI GPT-5.6 Luna & DALL-E 3
 */
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.LocalStorage
import Shotcut.Controls as Shotcut
import org.shotcut.qml as Shotcut
import "OpenAiClient.js" as OpenAiClient
import "mediamogulStorage.js" as MediaMogulStorage
import "mediamogulPresets.js" as MediaMogulPresets

Shotcut.KeyframableFilter {
    id: mediaMogulRoot

    function applyLoadedKey(key) {
        if (key && key.trim().length > 0) {
            mediaMogulRoot.userApiKey = key.trim();
            apiKeyInput.text = key.trim();
            keyStatusLabel.text = "Key connected (" + key.substring(0, 7) + "..." + key.substring(key.length - 4) + ")";
        }
    }

    function loadCompanionApiKey() {
        try {
            var xhr = new XMLHttpRequest();
            var homeUser = (application.OS === "Windows") ? (settings.appDataLocation ? settings.appDataLocation.replace(/\\/g, "/").split("/AppData/")[0] : "") : "";
            if (homeUser) {
                xhr.open("GET", "file:///" + homeUser + "/.mediamogul_companion.json");
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                        try {
                            var data = JSON.parse(xhr.responseText);
                            if (data && data.api_key) {
                                applyLoadedKey(data.api_key);
                                MediaMogulStorage.saveSetting("openai_api_key", data.api_key);
                            }
                        } catch (e) {}
                    }
                };
                xhr.send();
            }
        } catch (err) {
            console.log("MediaMogul: loadCompanionApiKey error: " + err);
        }
    }

    function setControls() {
        if (typeof textArea !== 'undefined' && textArea) {
            textArea.text = filter.get('argument') || "";
        }
        if (typeof textFilterUi !== 'undefined' && textFilterUi && typeof textFilterUi.setControls === 'function') {
            textFilterUi.setControls();
        }
    }

    keyframableParameters: ['fgcolour', 'olcolour', 'bgcolour', 'opacity']
    startValues: [Qt.rgba(1, 1, 1, 1), Qt.rgba(0, 0, 0, 2.0 / 3.0), Qt.rgba(0, 0, 0, 0), 0.0]
    middleValues: [Qt.rgba(1, 1, 1, 1), Qt.rgba(0, 0, 0, 2.0 / 3.0), Qt.rgba(0, 0, 0, 0), 1.0]
    endValues: [Qt.rgba(1, 1, 1, 1), Qt.rgba(0, 0, 0, 2.0 / 3.0), Qt.rgba(0, 0, 0, 0), 0.0]

    width: 440
    height: 720

    property string userApiKey: ""
    property bool isGeneratingText: false
    property bool isGeneratingImage: false
    property string statusMessage: ""
    property bool statusIsError: false

    // Multi-turn Conversation Memory & Token Budgeting
    property var conversationHistory: []
    property int estimatedTokens: 0
    property bool dangerousMode: false
    property int maxContextTokens: 8192
    property int maxOutputTokens: 800

    Component.onCompleted: {
        filter.blockSignals = true;
        if (typeof textFilterUi !== 'undefined' && textFilterUi) {
            filter.set(textFilterUi.middleValue, Qt.rect(0, 0, profile.width, profile.height));
            filter.set(textFilterUi.startValue, Qt.rect(0, 0, profile.width, profile.height));
            filter.set(textFilterUi.endValue, Qt.rect(0, 0, profile.width, profile.height));
        }

        if (filter.isNew) {
            if (application.OS === 'Windows')
                filter.set('family', 'Segoe UI');
            else if (application.OS === 'macOS')
                filter.set('family', "Helvetica Neue");
            else
                filter.set('family', "Sans-Serif");

            filter.set('fgcolour', '#ffffffff');
            filter.set('bgcolour', '#c8000000');
            filter.set('olcolour', '#ff000000');
            filter.set('opacity', 1.0);
            filter.set('outline', 3);
            filter.set('weight', Font.Bold);
            filter.set('style', 'normal');
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.useFontSizeProperty, false);
                filter.set('size', profile.height);
                filter.set(textFilterUi.rectProperty, '10%/75%:80%x15%');
                filter.set(textFilterUi.valignProperty, 'middle');
                filter.set(textFilterUi.halignProperty, 'center');
            }
            filter.set('pad', 12);
        } else {
            if (filter.get('opacity') === null)
                filter.set('opacity', 1.0);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.middleValue, filter.getRect(textFilterUi.rectProperty, filter.animateIn + 1));
                if (filter.animateIn > 0)
                    filter.set(textFilterUi.startValue, filter.getRect(textFilterUi.rectProperty, 0));
                if (filter.animateOut > 0)
                    filter.set(textFilterUi.endValue, filter.getRect(textFilterUi.rectProperty, filter.duration - 1));
            }
        }

        filter.blockSignals = false;
        setControls();

        // Initialize persistent settings and load saved API key
        try {
            MediaMogulStorage.initDb();
        } catch (e) {
            console.log("MediaMogul: initDb: " + e);
        }

        var savedKey = "";
        try {
            savedKey = MediaMogulStorage.loadSetting("openai_api_key", "");
        } catch (e) {}

        if (!savedKey || savedKey.length === 0) {
            savedKey = filter.get("shotcut:mediamogul_api_key") || "";
        }

        if (savedKey && savedKey.length > 0) {
            applyLoadedKey(savedKey);
        } else {
            keyStatusLabel.text = "Checking configuration...";
            loadCompanionApiKey();
        }

        var savedModel = "gpt-5.6-luna";
        try {
            savedModel = MediaMogulStorage.loadSetting("openai_model", "gpt-5.6-luna");
        } catch (e) {}
        if (savedModel === "gpt-5.6-luna") modelCombo.currentIndex = 0;
        else if (savedModel === "gpt-4o") modelCombo.currentIndex = 1;
        else if (savedModel === "gpt-4o-mini") modelCombo.currentIndex = 2;
        else if (savedModel === "gpt-3.5-turbo") modelCombo.currentIndex = 3;
        else modelCombo.currentIndex = 0;

        try {
            mediaMogulRoot.dangerousMode = (MediaMogulStorage.loadSetting("dangerous_mode", "false") === "true");
            mediaMogulRoot.maxContextTokens = parseInt(MediaMogulStorage.loadSetting("max_context_tokens", "8192"), 10) || 8192;
            mediaMogulRoot.maxOutputTokens = parseInt(MediaMogulStorage.loadSetting("max_output_tokens", "800"), 10) || 800;
        } catch (e) {}
    }

    function resetConversationHistory() {
        conversationHistory = [];
        estimatedTokens = 0;
        statusIsError = false;
        statusMessage = "Conversation memory cleared.";
    }

    function applyVideoModifications(actionObj) {
        MediaMogulPresets.applyVideoModifications(filter, textFilterUi, textArea, setControls, actionObj);
    }

    function generateAiText() {
        if (!mediaMogulRoot.userApiKey || mediaMogulRoot.userApiKey.trim() === "") {
            statusIsError = true;
            statusMessage = "Please configure your OpenAI API Key in the 'Settings' tab first.";
            mainTabNav.currentIndex = 3;
            return;
        }

        var topic = topicInput.text.trim();
        if (topic === "") {
            statusIsError = true;
            statusMessage = "Please enter a topic or context above.";
            return;
        }

        isGeneratingText = true;
        statusIsError = false;
        statusMessage = "Generating with OpenAI " + modelCombo.currentText + "...";

        var mode = modeCombo.currentValue;
        var tone = toneCombo.currentText;
        var model = modelCombo.currentValue;

        var systemPrompt = "You are MediaMogul Copilot, an expert AI video director and graphics animator for Shotcut. " +
            "You remember the full conversation history across multiple turns. When the user asks for text or video graphics, generate concise, punchy text. " +
            "You can directly command and manipulate the video filter by appending a JSON action block at the end of your response:\n" +
            "```json\n" +
            "{\n" +
            '  "action": "modify_video",\n' +
            '  "text": "The exact on-screen text",\n' +
            '  "preset": "viral_youtube" | "breaking_news" | "cinematic_gold" | "cyberpunk_neon" | "clean_lower_third" | "subtitles_caption" | "minimalist_white" | "retro_synthwave",\n' +
            '  "position": "lower_third" | "top_banner" | "center_title" | "bottom_ticker" | "full_screen",\n' +
            '  "fgcolour": "#ffffeb3b",\n' +
            '  "bgcolour": "#00000000",\n' +
            '  "olcolour": "#ff000000",\n' +
            '  "outline": 6,\n' +
            '  "family": "Impact" | "Segoe UI" | "Georgia" | "Consolas",\n' +
            '  "weight": "bold",\n' +
            '  "halign": "center" | "left" | "right"\n' +
            "}\n" +
            "```\n" +
            "If the user simply wants text, return the text without quotes. If video styling, positioning, or presets are mentioned, ALWAYS include the JSON action block.";

        var userPrompt = "";
        if (mode === "title") {
            userPrompt = "Generate 1 punchy, high-impact video title in a " + tone + " tone for: " + topic;
        } else if (mode === "hook") {
            userPrompt = "Generate 1 engaging opening video hook sentence in a " + tone + " tone to capture viewer attention in the first 3 seconds for: " + topic;
        } else if (mode === "lower_third") {
            userPrompt = "Format a 2-line lower third graphic for video based on this info: " + topic + "\nLine 1: Name or Primary Heading\nLine 2: Title, Role, or Subtext";
        } else if (mode === "summary") {
            userPrompt = "Write a concise 1-sentence on-screen summary or takeaway caption in a " + tone + " tone about: " + topic;
        } else if (mode === "cta") {
            userPrompt = "Write a catchy call to action for the video viewer in a " + tone + " tone for: " + topic;
        } else if (mode === "translate") {
            var lang = langCombo.currentText;
            userPrompt = "Translate the following video caption or script accurately and naturally into " + lang + ":\n" + topic;
        } else {
            userPrompt = topic;
        }

        // Initialize conversation history with system prompt if empty
        if (!conversationHistory || conversationHistory.length === 0) {
            conversationHistory = [{ role: "system", content: systemPrompt }];
        }
        conversationHistory.push({ role: "user", content: userPrompt });

        var tokenLimit = dangerousMode ? maxContextTokens : 8192;
        var outLimit = dangerousMode ? maxOutputTokens : 800;

        OpenAiClient.chatConversation(
            mediaMogulRoot.userApiKey,
            model,
            conversationHistory,
            0.7,
            outLimit,
            tokenLimit,
            function(err, replyText, usage, prunedHistory) {
                isGeneratingText = false;
                if (err) {
                    statusIsError = true;
                    statusMessage = "Error: " + err.message;
                    // Remove last user prompt if request failed
                    conversationHistory.pop();
                } else {
                    conversationHistory = prunedHistory.slice();
                    conversationHistory.push({ role: "assistant", content: replyText });

                    // Check for JSON action block
                    var actionApplied = false;
                    var jsonMatch = replyText.match(/```json\s*([\s\S]*?)\s*```/) || replyText.match(/\{[\s\S]*"action"\s*:\s*"modify_video"[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            var jsonStr = jsonMatch[1] ? jsonMatch[1] : jsonMatch[0];
                            var actionObj = JSON.parse(jsonStr);
                            applyVideoModifications(actionObj);
                            actionApplied = true;
                        } catch (pe) {
                            console.log("MediaMogul: JSON parse error: " + pe.message);
                        }
                    }

                    // Clean text for text area if not set by action
                    var cleanText = replyText.replace(/```json[\s\S]*?```/g, "").trim();
                    if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
                        cleanText = cleanText.slice(1, -1);
                    }
                    if (!actionApplied || cleanText.length > 0) {
                        textArea.text = cleanText;
                        filter.set('argument', cleanText);
                    }

                    estimatedTokens = usage.total_tokens || OpenAiClient.countMessageTokens(conversationHistory);
                    statusIsError = false;
                    statusMessage = actionApplied ? "✨ Video graphics modified & memory updated! (~" + estimatedTokens + " tokens)" : "✨ Generated with memory (~" + estimatedTokens + " tokens)";
                }
            }
        );
    }

    function generateDalleImage() {
        if (!mediaMogulRoot.userApiKey || mediaMogulRoot.userApiKey.trim() === "") {
            statusIsError = true;
            statusMessage = "Please enter your OpenAI API Key in the 'Settings' tab first.";
            mainTabNav.currentIndex = 3;
            return;
        }

        var prompt = imgPromptInput.text.trim();
        if (prompt === "") {
            statusIsError = true;
            statusMessage = "Please enter an image prompt.";
            return;
        }

        isGeneratingImage = true;
        statusIsError = false;
        statusMessage = "Generating DALL-E 3 visual (this may take ~15-30s)...";

        var fullPrompt = prompt;
        var style = imgStyleCombo.currentValue;
        if (style !== "none") {
            fullPrompt += ", " + style;
        }

        var size = imgSizeCombo.currentValue;
        var quality = imgQualityCombo.currentValue;

        OpenAiClient.generateImage(
            mediaMogulRoot.userApiKey,
            fullPrompt,
            size,
            quality,
            "vivid",
            function(err, url, revisedPrompt) {
                isGeneratingImage = false;
                if (err) {
                    statusIsError = true;
                    statusMessage = "DALL-E Error: " + err.message;
                } else {
                    statusIsError = false;
                    statusMessage = "🎨 DALL-E 3 image generated successfully!";
                    dallePreview.source = url;
                    dalleRevisedLabel.text = "Prompt: " + revisedPrompt;
                    dalleResultBox.visible = true;
                }
            }
        );
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 6
        spacing: 6

        // Header Card
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 52
            radius: 6
            color: "#1e1b2e"
            border.color: "#6366f1"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 8
                spacing: 8

                Image {
                    source: "icon.webp"
                    width: 36
                    height: 36
                    fillMode: Image.PreserveAspectFit
                    smooth: true
                }

                ColumnLayout {
                    spacing: 1
                    Layout.fillWidth: true

                    Label {
                        text: "MediaMogul"
                        font.pixelSize: 14
                        font.bold: true
                        color: "#ffffff"
                    }

                    Label {
                        text: "AI Video Copilot (GPT-5.6 Luna & DALL-E 3)"
                        font.pixelSize: 10
                        color: "#a5b4fc"
                    }
                }

                Button {
                    text: qsTr("🚀 AI Center")
                    font.pixelSize: 10
                    onClicked: {
                        var exeUrl = Qt.resolvedUrl("mediamogul_command_center.exe");
                        var batUrl = Qt.resolvedUrl("run_command_center.bat");
                        if (!Qt.openUrlExternally(exeUrl)) {
                            Qt.openUrlExternally(batUrl);
                        }
                    }
                }

                Rectangle {
                    width: 72
                    height: 22
                    radius: 11
                    color: mediaMogulRoot.userApiKey ? "#065f46" : "#7f1d1d"

                    Label {
                        anchors.centerIn: parent
                        text: mediaMogulRoot.userApiKey ? "● Connected" : "● No Key"
                        font.pixelSize: 9
                        font.bold: true
                        color: mediaMogulRoot.userApiKey ? "#34d399" : "#f87171"
                    }
                }
            }
        }

        // Tab Navigation
        TabBar {
            id: mainTabNav
            Layout.fillWidth: true
            currentIndex: 0

            TabButton {
                text: "✍️ AI Text"
                font.pixelSize: 11
            }
            TabButton {
                text: "🎨 DALL-E 3"
                font.pixelSize: 11
            }
            TabButton {
                text: "📐 Style & Layout"
                font.pixelSize: 11
            }
            TabButton {
                text: "⚙️ Settings"
                font.pixelSize: 11
            }
        }

        // Status banner
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: statusMessage ? 28 : 0
            visible: statusMessage !== ""
            radius: 4
            color: statusIsError ? "#450a0a" : "#064e3b"
            border.color: statusIsError ? "#dc2626" : "#059669"
            border.width: 1

            Label {
                anchors.centerIn: parent
                text: statusMessage
                color: statusIsError ? "#fca5a5" : "#6ee7b7"
                font.pixelSize: 11
                elide: Text.ElideRight
                width: parent.width - 16
                horizontalAlignment: Text.AlignHCenter
            }
        }

        // Stacked View
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: mainTabNav.currentIndex

            // ==========================================
            // TAB 0: AI TEXT & TITLES
            // ==========================================
            ScrollView {
                clip: true
                ScrollBar.horizontal.policy: ScrollBar.AlwaysOff

                ColumnLayout {
                    width: parent.width
                    spacing: 8

                    GridLayout {
                        columns: 2
                        Layout.fillWidth: true
                        rowSpacing: 6
                        columnSpacing: 8

                        Label {
                            text: qsTr("Mode:")
                            font.bold: true
                            Layout.alignment: Qt.AlignRight
                        }

                        ComboBox {
                            id: modeCombo
                            Layout.fillWidth: true
                            textRole: "text"
                            valueRole: "value"
                            model: ListModel {
                                ListElement { text: "🎬 AI Video Director (Full Control)"; value: "director" }
                                ListElement { text: "🔥 Viral Video Title"; value: "title" }
                                ListElement { text: "🪝 3-Second Opening Hook"; value: "hook" }
                                ListElement { text: "🏷️ Lower Third (Name & Role)"; value: "lower_third" }
                                ListElement { text: "📝 Scene Caption & Summary"; value: "summary" }
                                ListElement { text: "📢 Call to Action (CTA)"; value: "cta" }
                                ListElement { text: "🌐 Language Translator"; value: "translate" }
                                ListElement { text: "💬 Custom AI Prompt"; value: "custom" }
                            }
                        }

                        Label {
                            text: qsTr("Tone:")
                            font.bold: true
                            Layout.alignment: Qt.AlignRight
                        }

                        ComboBox {
                            id: toneCombo
                            Layout.fillWidth: true
                            model: ["Engaging & Trendy", "Professional & Clean", "Cinematic & Dramatic", "Casual & Humorous", "High-Energy & Urgent", "Minimalist"]
                        }

                        Label {
                            text: qsTr("Language:")
                            font.bold: true
                            Layout.alignment: Qt.AlignRight
                            visible: modeCombo.currentValue === "translate"
                        }

                        ComboBox {
                            id: langCombo
                            Layout.fillWidth: true
                            visible: modeCombo.currentValue === "translate"
                            model: ["Spanish", "French", "German", "Japanese", "Chinese (Mandarin)", "Italian", "Portuguese", "Korean", "English", "Russian", "Hindi"]
                        }

                        Label {
                            text: qsTr("Model:")
                            font.bold: true
                            Layout.alignment: Qt.AlignRight
                        }

                        ComboBox {
                            id: modelCombo
                            Layout.fillWidth: true
                            textRole: "text"
                            valueRole: "value"
                            model: ListModel {
                                ListElement { text: "gpt-5.6-luna (Fast, Next-Gen & Recommended)"; value: "gpt-5.6-luna" }
                                ListElement { text: "gpt-4o (Highest Intelligence)"; value: "gpt-4o" }
                                ListElement { text: "gpt-4o-mini (Fast)"; value: "gpt-4o-mini" }
                                ListElement { text: "gpt-3.5-turbo (Legacy)"; value: "gpt-3.5-turbo" }
                            }
                            onCurrentValueChanged: {
                                try {
                                    MediaMogulStorage.saveSetting("openai_model", currentValue);
                                } catch (e) {}
                            }
                        }
                    }

                    Label {
                        text: qsTr("Topic / Prompt / Scene Context:")
                        font.bold: true
                    }

                    TextField {
                        id: topicInput
                        Layout.fillWidth: true
                        placeholderText: modeCombo.currentValue === "translate" ? "Enter text to translate..." : "e.g. Tech reviewer explaining why new camera sensor is a game changer"
                        selectByMouse: true
                    }

                    Button {
                        Layout.fillWidth: true
                        text: isGeneratingText ? "Generating & Transforming Video..." : "✨ Execute Video AI Command"
                        enabled: !isGeneratingText
                        highlighted: true
                        onClicked: generateAiText()
                    }

                    // Conversation Memory Status Bar & Quick Actions
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 34
                        radius: 4
                        color: mediaMogulRoot.dangerousMode ? "#3b1111" : "#1e1b4b"
                        border.color: mediaMogulRoot.dangerousMode ? "#ef4444" : "#6366f1"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 6
                            spacing: 8

                            Label {
                                text: mediaMogulRoot.dangerousMode ?
                                      "⚠️ Unlocked: ~" + mediaMogulRoot.estimatedTokens + " / " + mediaMogulRoot.maxContextTokens + " tokens (" + Math.max(0, mediaMogulRoot.conversationHistory.length - 1) + " msgs)" :
                                      "🧠 Memory: ~" + mediaMogulRoot.estimatedTokens + " / " + (mediaMogulRoot.maxContextTokens || 8192) + " tokens (" + Math.max(0, mediaMogulRoot.conversationHistory.length - 1) + " msgs)"
                                font.pixelSize: 10
                                color: mediaMogulRoot.dangerousMode ? "#fca5a5" : "#c7d2fe"
                                font.bold: true
                                Layout.fillWidth: true
                                elide: Text.ElideRight
                            }

                            Button {
                                text: qsTr("🗑️ Clear Memory")
                                font.pixelSize: 9
                                onClicked: resetConversationHistory()
                            }
                        }
                    }

                    // Quick Video Style Presets
                    Label {
                        text: qsTr("Instant Video Presets (Physical MLT Controls):")
                        font.pixelSize: 10
                        font.bold: true
                        color: "#94a3b8"
                    }

                    GridLayout {
                        columns: 3
                        Layout.fillWidth: true
                        rowSpacing: 4
                        columnSpacing: 4

                        Button {
                            text: "🔥 YouTube Viral"
                            font.pixelSize: 9
                            Layout.fillWidth: true
                            onClicked: applyVideoModifications({ preset: "viral_youtube" })
                        }
                        Button {
                            text: "📰 Breaking News"
                            font.pixelSize: 9
                            Layout.fillWidth: true
                            onClicked: applyVideoModifications({ preset: "breaking_news" })
                        }
                        Button {
                            text: "🎬 Cinema Gold"
                            font.pixelSize: 9
                            Layout.fillWidth: true
                            onClicked: applyVideoModifications({ preset: "cinematic_gold" })
                        }
                        Button {
                            text: "⚡ Cyberpunk"
                            font.pixelSize: 9
                            Layout.fillWidth: true
                            onClicked: applyVideoModifications({ preset: "cyberpunk_neon" })
                        }
                        Button {
                            text: "🏷️ Lower Third"
                            font.pixelSize: 9
                            Layout.fillWidth: true
                            onClicked: applyVideoModifications({ preset: "clean_lower_third" })
                        }
                        Button {
                            text: "💬 Subtitles/CC"
                            font.pixelSize: 9
                            Layout.fillWidth: true
                            onClicked: applyVideoModifications({ preset: "subtitles_caption" })
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 1
                        color: "#374151"
                        Layout.topMargin: 4
                        Layout.bottomMargin: 4
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Label {
                            text: qsTr("Video Text Output (Live on Screen):")
                            font.bold: true
                            Layout.fillWidth: true
                        }

                        Button {
                            text: qsTr("Clear")
                            font.pixelSize: 10
                            onClicked: {
                                textArea.text = "";
                                filter.set('argument', "");
                            }
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 110
                        color: "#111827"
                        border.color: "#4b5563"
                        border.width: 1
                        radius: 4

                        ScrollView {
                            anchors.fill: parent
                            anchors.margins: 4
                            clip: true

                            TextArea {
                                id: textArea
                                placeholderText: qsTr("AI generated text will appear here and render onto your video...")
                                wrapMode: TextEdit.Wrap
                                selectByMouse: true
                                font.pixelSize: 13
                                color: "#f3f4f6"
                                onTextChanged: {
                                    if (text !== '__empty__') {
                                        filter.set('argument', text);
                                    }
                                }
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Button {
                            Layout.fillWidth: true
                            text: qsTr("🎬 Apply to Video Clip")
                            onClicked: {
                                filter.set('argument', textArea.text);
                                statusIsError = false;
                                statusMessage = "Updated video text overlay!";
                            }
                        }

                        Button {
                            text: qsTr("📋 Copy")
                            onClicked: {
                                textArea.selectAll();
                                textArea.copy();
                                statusIsError = false;
                                statusMessage = "Copied to clipboard!";
                            }
                        }
                    }
                }
            }

            // ==========================================
            // TAB 1: DALL-E 3 B-ROLL GENERATOR
            // ==========================================
            ScrollView {
                clip: true
                ScrollBar.horizontal.policy: ScrollBar.AlwaysOff

                ColumnLayout {
                    width: parent.width
                    spacing: 8

                    Label {
                        text: qsTr("Generate AI B-Roll & Visuals (DALL-E 3):")
                        font.bold: true
                    }

                    TextField {
                        id: imgPromptInput
                        Layout.fillWidth: true
                        placeholderText: qsTr("e.g. Cinematic wide shot of futuristic Tokyo in rain, neon reflections")
                        selectByMouse: true
                    }

                    GridLayout {
                        columns: 2
                        Layout.fillWidth: true
                        rowSpacing: 4
                        columnSpacing: 6

                        Label {
                            text: qsTr("Style:")
                            Layout.alignment: Qt.AlignRight
                        }

                        ComboBox {
                            id: imgStyleCombo
                            Layout.fillWidth: true
                            textRole: "text"
                            valueRole: "value"
                            model: ListModel {
                                ListElement { text: "Cinematic Film (35mm Anamorphic)"; value: "cinematic film still, 35mm photograph, dramatic cinematic lighting, photorealistic, 8k" }
                                ListElement { text: "Photorealistic Photography"; value: "ultra-realistic photographic portrait, highly detailed, natural lighting" }
                                ListElement { text: "Cyberpunk Neon"; value: "cyberpunk aesthetic, vibrant neon lighting, dark moody atmosphere" }
                                ListElement { text: "3D Unreal Engine 5 / Render"; value: "octane render, unreal engine 5, 3d digital art, raytraced" }
                                ListElement { text: "Studio Anime"; value: "studio anime style, vibrant colors, clean lineart, aesthetic wallpaper" }
                                ListElement { text: "Minimalist Vector"; value: "flat minimalist vector illustration, clean modern graphics" }
                                ListElement { text: "None / Custom Prompt Only"; value: "none" }
                            }
                        }

                        Label {
                            text: qsTr("Aspect Ratio:")
                            Layout.alignment: Qt.AlignRight
                        }

                        ComboBox {
                            id: imgSizeCombo
                            Layout.fillWidth: true
                            textRole: "text"
                            valueRole: "value"
                            model: ListModel {
                                ListElement { text: "16:9 Landscape (1792x1024) - HD Video"; value: "1792x1024" }
                                ListElement { text: "1:1 Square (1024x1024) - Social / Instagram"; value: "1024x1024" }
                                ListElement { text: "9:16 Portrait (1024x1792) - Shorts / TikTok"; value: "1024x1792" }
                            }
                        }

                        Label {
                            text: qsTr("Quality:")
                            Layout.alignment: Qt.AlignRight
                        }

                        ComboBox {
                            id: imgQualityCombo
                            Layout.fillWidth: true
                            textRole: "text"
                            valueRole: "value"
                            model: ListModel {
                                ListElement { text: "Standard"; value: "standard" }
                                ListElement { text: "HD (High Detail)"; value: "hd" }
                            }
                        }
                    }

                    Button {
                        Layout.fillWidth: true
                        text: isGeneratingImage ? "Rendering DALL-E 3 Image (takes ~20s)..." : "🎨 Generate B-Roll Image"
                        enabled: !isGeneratingImage
                        highlighted: true
                        onClicked: generateDalleImage()
                    }

                    // Result Preview
                    Rectangle {
                        id: dalleResultBox
                        Layout.fillWidth: true
                        Layout.preferredHeight: 220
                        color: "#0f172a"
                        border.color: "#3b82f6"
                        border.width: 1
                        radius: 6
                        visible: false

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 6
                            spacing: 4

                            Image {
                                id: dallePreview
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                fillMode: Image.PreserveAspectFit
                            }

                            Label {
                                id: dalleRevisedLabel
                                Layout.fillWidth: true
                                font.pixelSize: 9
                                color: "#94a3b8"
                                elide: Text.ElideRight
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                Button {
                                    Layout.fillWidth: true
                                    text: qsTr("Open in Web Browser / Download")
                                    font.pixelSize: 11
                                    onClicked: {
                                        if (dallePreview.source) {
                                            Qt.openUrlExternally(dallePreview.source);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ==========================================
            // TAB 2: STYLE & POSITION (TextFilterUi)
            // ==========================================
            ScrollView {
                clip: true
                ScrollBar.horizontal.policy: ScrollBar.AlwaysOff

                ColumnLayout {
                    width: parent.width
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        Label {
                            text: qsTr("Preset:")
                            font.bold: true
                        }

                        Shotcut.Preset {
                            id: preset
                            Layout.fillWidth: true
                            parameters: textFilterUi.parameterList.concat(['argument'])
                            onBeforePresetLoaded: {
                                filter.resetProperty(textFilterUi.rectProperty);
                                filter.set(textFilterUi.pointSizeProperty, 0);
                                resetSimpleKeyframes();
                            }
                            onPresetSelected: {
                                if (filter.get('opacity') === '')
                                    filter.set('opacity', 1.0);
                                setControls();
                                textFilterUi.setKeyframedControls();
                                initializeSimpleKeyframes();
                                filter.blockSignals = true;
                                filter.set(textFilterUi.middleValue, filter.getRect(textFilterUi.rectProperty, filter.animateIn + 1));
                                if (filter.animateIn > 0)
                                    filter.set(textFilterUi.startValue, filter.getRect(textFilterUi.rectProperty, 0));
                                if (filter.animateOut > 0)
                                    filter.set(textFilterUi.endValue, filter.getRect(textFilterUi.rectProperty, filter.duration - 1));
                                filter.blockSignals = false;
                            }
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 1
                        color: "#374151"
                    }

                    Shotcut.TextFilterUi {
                        id: textFilterUi
                        Layout.fillWidth: true
                    }
                }
            }

            // ==========================================
            // TAB 3: SETTINGS & OPENAI API KEY
            // ==========================================
            ScrollView {
                clip: true
                ScrollBar.horizontal.policy: ScrollBar.AlwaysOff

                ColumnLayout {
                    width: parent.width
                    spacing: 10

                    Label {
                        text: qsTr("OpenAI API Configuration:")
                        font.bold: true
                        font.pixelSize: 13
                    }

                    Label {
                        text: qsTr("Your OpenAI API Key is stored locally and securely on your computer. It enables GPT-5.6 Luna text generation, Whisper subtitles, and DALL-E 3 image rendering.")
                        wrapMode: Text.WordWrap
                        font.pixelSize: 11
                        color: "#9ca3af"
                        Layout.fillWidth: true
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        TextField {
                            id: apiKeyInput
                            Layout.fillWidth: true
                            echoMode: showKeyCheck.checked ? TextInput.Normal : TextInput.Password
                            placeholderText: "sk-proj-..."
                            selectByMouse: true
                            onTextChanged: {
                                mediaMogulRoot.userApiKey = text.trim();
                            }
                        }

                        CheckBox {
                            id: showKeyCheck
                            text: qsTr("Show")
                        }
                    }

                    Label {
                        id: keyStatusLabel
                        font.pixelSize: 10
                        color: mediaMogulRoot.userApiKey ? "#34d399" : "#fbbf24"
                        Layout.fillWidth: true
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Button {
                            Layout.fillWidth: true
                            text: qsTr("💾 Save Key")
                            onClicked: {
                                var key = apiKeyInput.text.trim();
                                if (key.length > 0) {
                                    MediaMogulStorage.saveSetting("openai_api_key", key);
                                    filter.set("shotcut:mediamogul_api_key", key);
                                    mediaMogulRoot.userApiKey = key;
                                    statusIsError = false;
                                    statusMessage = "API Key saved successfully!";
                                    keyStatusLabel.text = "Key saved permanently.";
                                }
                            }
                        }

                        Button {
                            Layout.fillWidth: true
                            text: qsTr("⚡ Test Connection")
                            onClicked: {
                                var key = apiKeyInput.text.trim();
                                statusMessage = "Testing OpenAI API connection...";
                                statusIsError = false;
                                OpenAiClient.testApiKey(key, function(err, ok, msg) {
                                    if (ok) {
                                        statusIsError = false;
                                        statusMessage = "✓ Connection Successful! " + msg;
                                        keyStatusLabel.text = "Verified and connected to OpenAI API.";
                                    } else {
                                        statusIsError = true;
                                        statusMessage = "✗ Connection Failed: " + (err ? err.message : msg);
                                        keyStatusLabel.text = "Connection test failed.";
                                    }
                                });
                            }
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 1
                        color: "#374151"
                        Layout.topMargin: 6
                        Layout.bottomMargin: 6
                    }

                    // DANGEROUS HIGH-TOKEN MODE SETTINGS
                    Rectangle {
                        Layout.fillWidth: true
                        radius: 6
                        color: dangerousModeToggle.checked ? "#350c0c" : "#1e1b4b"
                        border.color: dangerousModeToggle.checked ? "#ef4444" : "#6366f1"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true
                                CheckBox {
                                    id: dangerousModeToggle
                                    checked: mediaMogulRoot.dangerousMode
                                    text: qsTr("⚠️ Unlock High-Token Dangerous Mode")
                                    font.bold: true
                                    onCheckedChanged: {
                                        mediaMogulRoot.dangerousMode = checked;
                                    }
                                }
                            }

                            Label {
                                text: qsTr("DANGEROUS OPTION: By default, the AI limits context to ~8,192 tokens and 800 output tokens. Enabling this mode allows extensive conversation recall (up to 128k tokens) and large responses (up to 8,192 tokens), but may consume OpenAI API quota and credits very rapidly.")
                                wrapMode: Text.WordWrap
                                font.pixelSize: 10
                                color: dangerousModeToggle.checked ? "#fca5a5" : "#94a3b8"
                                Layout.fillWidth: true
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8
                                visible: dangerousModeToggle.checked

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    Label {
                                        text: qsTr("Max Context Window (Tokens):")
                                        font.pixelSize: 10
                                        font.bold: true
                                        color: "#e2e8f0"
                                    }
                                    TextField {
                                        id: contextTokensInput
                                        text: String(mediaMogulRoot.maxContextTokens)
                                        Layout.fillWidth: true
                                        placeholderText: "e.g. 32768 or 65536"
                                        selectByMouse: true
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    Label {
                                        text: qsTr("Max Output Tokens:")
                                        font.pixelSize: 10
                                        font.bold: true
                                        color: "#e2e8f0"
                                    }
                                    TextField {
                                        id: outputTokensInput
                                        text: String(mediaMogulRoot.maxOutputTokens)
                                        Layout.fillWidth: true
                                        placeholderText: "e.g. 2048 or 4096"
                                        selectByMouse: true
                                    }
                                }
                            }

                            Button {
                                Layout.fillWidth: true
                                text: qsTr("💾 Save Token Budget Settings")
                                onClicked: {
                                    mediaMogulRoot.dangerousMode = dangerousModeToggle.checked;
                                    var cTokens = parseInt(contextTokensInput.text.trim(), 10) || 8192;
                                    var oTokens = parseInt(outputTokensInput.text.trim(), 10) || 800;
                                    mediaMogulRoot.maxContextTokens = cTokens;
                                    mediaMogulRoot.maxOutputTokens = oTokens;
                                    MediaMogulStorage.saveSetting("dangerous_mode", dangerousModeToggle.checked ? "true" : "false");
                                    MediaMogulStorage.saveSetting("max_context_tokens", String(cTokens));
                                    MediaMogulStorage.saveSetting("max_output_tokens", String(oTokens));
                                    statusIsError = false;
                                    statusMessage = "Token settings saved (" + (dangerousModeToggle.checked ? "Dangerous High-Token Active" : "Standard") + ")!";
                                }
                            }
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 1
                        color: "#374151"
                        Layout.topMargin: 6
                        Layout.bottomMargin: 6
                    }

                    Label {
                        text: qsTr("Need an OpenAI API Key?")
                        font.bold: true
                    }

                    Button {
                        Layout.fillWidth: true
                        text: qsTr("🌐 Open OpenAI API Keys Dashboard")
                        onClicked: {
                            Qt.openUrlExternally("https://platform.openai.com/api-keys");
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 1
                        color: "#374151"
                        Layout.topMargin: 6
                        Layout.bottomMargin: 6
                    }

                    Label {
                        text: qsTr("MediaMogul Companion Tools:")
                        font.bold: true
                    }

                    Label {
                        text: qsTr("To run automatic Whisper audio-to-subtitle transcription (.srt) or Text-to-Speech voiceovers, run the companion tool in the plugin folder.")
                        font.pixelSize: 11
                        color: "#9ca3af"
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }
            }
        }
    }
}
