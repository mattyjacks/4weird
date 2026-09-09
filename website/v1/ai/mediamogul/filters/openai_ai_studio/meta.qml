import QtQuick
import org.shotcut.qml

Metadata {
    type: Metadata.Filter
    objectName: 'openAiStudio'
    name: qsTr('AI Studio (OpenAI)')
    keywords: qsTr('ai openai gpt chatgpt text title lower-third dall-e generator script subtitles', 'search keywords for the AI Studio video filter') + ' ai: studio #rgba #10bit'
    mlt_service: 'dynamictext'
    qml: "ui.qml"
    vui: 'vui.qml'
    icon: 'icon.webp'
    help: 'https://platform.openai.com/docs'

    keyframes {
        allowAnimateIn: true
        allowAnimateOut: true
        simpleProperties: ['geometry', 'fgcolour', 'olcolour', 'bgcolour', 'opacity']
        parameters: [
            Parameter {
                name: qsTr('Position / Size')
                property: 'geometry'
                isRectangle: true
            },
            Parameter {
                name: qsTr('Font color')
                property: 'fgcolour'
                isCurve: false
                isColor: true
            },
            Parameter {
                name: qsTr('Outline')
                property: 'olcolour'
                isCurve: false
                isColor: true
            },
            Parameter {
                name: qsTr('Background')
                property: 'bgcolour'
                isCurve: false
                isColor: true
            },
            Parameter {
                name: qsTr('Opacity')
                property: 'opacity'
                isCurve: true
                minimum: 0
                maximum: 1
            }
        ]
    }
}
