import urllib.request
import json

script = "document.getElementById('btn-toggle-view').click()"
data = json.dumps({'script': script}).encode('utf-8')
req = urllib.request.Request('http://localhost:9999/eval', data=data, headers={'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
