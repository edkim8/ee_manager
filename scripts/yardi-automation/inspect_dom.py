#!/usr/bin/env python3
"""
inspect_dom.py — Query the live Yardi page DOM via CDP WebSocket.
Extracts frame names, Excel button HTML, and dashboard link structure.
No Playwright Inspector required.
"""
import asyncio, json, sys
import websockets

TARGET_ID = "89FF0617D5942F1BA1F2AA95CEF6EA8A"
WS_URL    = f"ws://localhost:9222/devtools/page/{TARGET_ID}"

async def cdp(ws, method, params=None):
    msg = {"id": 1, "method": method, "params": params or {}}
    await ws.send(json.dumps(msg))
    while True:
        raw = await ws.recv()
        data = json.loads(raw)
        if data.get("id") == 1:
            return data.get("result", {})

async def eval_js(ws, js: str):
    result = await cdp(ws, "Runtime.evaluate", {
        "expression": js,
        "returnByValue": True,
        "awaitPromise": False,
    })
    return result.get("result", {}).get("value")

async def main():
    async with websockets.connect(WS_URL, max_size=10_000_000) as ws:

        print("\n=== 1. ALL IFRAMES on page ===")
        frames = await eval_js(ws, """
            JSON.stringify([...document.querySelectorAll('iframe')].map(f => ({
                name: f.name,
                id: f.id,
                src: f.src.slice(0,100),
                title: f.title,
            })))
        """)
        for f in json.loads(frames or "[]"):
            print(f"  name={f['name']!r:20} id={f['id']!r:20} src={f['src']!r}")

        print("\n=== 2. EXCEL BUTTONS — main document ===")
        excel = await eval_js(ws, """
            JSON.stringify([...document.querySelectorAll(
                'a[href*="xls" i], a[href*="excel" i], img[src*="xls" i], img[src*="excel" i], input[src*="xls" i], a[title*="excel" i]'
            )].map(el => ({
                tag: el.tagName,
                outerHTML: el.outerHTML.slice(0,200),
            })))
        """)
        items = json.loads(excel or "[]")
        if items:
            for item in items:
                print(f"  {item['tag']}: {item['outerHTML']}")
        else:
            print("  (none found in main document)")

        print("\n=== 3. EXCEL BUTTONS — inside all iframes (via postMessage trick) ===")
        iframe_excel = await eval_js(ws, """
            (function() {
                let results = [];
                let frames = document.querySelectorAll('iframe');
                for (let f of frames) {
                    try {
                        let doc = f.contentDocument || f.contentWindow.document;
                        let els = doc.querySelectorAll(
                            'a[href*="xls" i], a[href*="excel" i], img[src*="xls" i], img[src*="excel" i], input[src*="xls" i], a[title*="excel" i], input[type="image"]'
                        );
                        for (let el of els) {
                            results.push({
                                frame_name: f.name,
                                tag: el.tagName,
                                html: el.outerHTML.slice(0,300),
                            });
                        }
                    } catch(e) { results.push({frame_name: f.name, error: e.toString()}); }
                }
                return JSON.stringify(results);
            })()
        """)
        items2 = json.loads(iframe_excel or "[]")
        if items2:
            for item in items2:
                if 'error' in item:
                    print(f"  Frame {item['frame_name']!r}: cross-origin blocked ({item['error'][:60]})")
                else:
                    print(f"  Frame {item['frame_name']!r} | {item['tag']}: {item['html']}")
        else:
            print("  (none found in iframes)")

        print("\n=== 4. VISIBLE TABLE HEADERS in iframes (to confirm report loaded) ===")
        headers = await eval_js(ws, """
            (function() {
                let results = [];
                let frames = document.querySelectorAll('iframe');
                for (let f of frames) {
                    try {
                        let doc = f.contentDocument || f.contentWindow.document;
                        let ths = [...doc.querySelectorAll('th, td.header, .colHeader')].slice(0,15);
                        results.push({
                            frame: f.name,
                            headers: ths.map(h => h.innerText.trim()).filter(Boolean),
                        });
                    } catch(e) {}
                }
                return JSON.stringify(results);
            })()
        """)
        for row in json.loads(headers or "[]"):
            if row['headers']:
                print(f"  Frame {row['frame']!r}: {row['headers']}")

asyncio.run(main())
