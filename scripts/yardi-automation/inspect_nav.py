#!/usr/bin/env python3
"""
inspect_nav.py — Dumps all navigation links and iframe structure from the
current Yardi page via CDP WebSocket. Run this while the page of interest
is open in Chrome (e.g. after opening the Reports sidebar or Analytic Reports menu).

Usage:
    python inspect_nav.py
"""
import asyncio, json, sys
import websockets
import urllib.request

CDP_PORT = 9222


def get_yardi_ws_url() -> str:
    with urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json") as resp:
        targets = json.loads(resp.read())
    for t in targets:
        if "yardipcu.com" in t.get("url", ""):
            return t["webSocketDebuggerUrl"]
    print("ERROR: Yardi tab not found.")
    sys.exit(1)


async def eval_js(ws, js: str, description: str = ""):
    msg = {"id": 1, "method": "Runtime.evaluate", "params": {
        "expression": js, "returnByValue": True, "awaitPromise": False,
    }}
    await ws.send(json.dumps(msg))
    while True:
        raw = await ws.recv()
        data = json.loads(raw)
        if data.get("id") == 1:
            val = data.get("result", {}).get("result", {}).get("value")
            return val


async def main():
    ws_url = get_yardi_ws_url()
    print(f"Connecting to: {ws_url}\n")

    async with websockets.connect(ws_url, max_size=10_000_000) as ws:

        print("=== ALL IFRAMES ===")
        frames = await eval_js(ws, """
            JSON.stringify([...document.querySelectorAll('iframe')].map(f => ({
                name: f.name, id: f.id, src: f.src.slice(0,120)
            })))
        """)
        for f in json.loads(frames or "[]"):
            print(f"  name={f['name']!r:20} src={f['src']!r}")

        print("\n=== ALL LINKS IN MAIN DOCUMENT ===")
        links = await eval_js(ws, """
            JSON.stringify([...document.querySelectorAll('a')].map(a => ({
                text: a.innerText.trim().slice(0,60),
                href: (a.href||'').slice(0,100),
                id: a.id,
            })).filter(a => a.text))
        """)
        seen = set()
        for a in json.loads(links or "[]"):
            key = a['text']
            if key not in seen:
                seen.add(key)
                print(f"  {a['text']!r:40} href={a['href']!r}")

        print("\n=== ALL LINKS INSIDE IFRAMES ===")
        iframe_links = await eval_js(ws, """
            (function() {
                let out = [];
                for (let f of document.querySelectorAll('iframe')) {
                    try {
                        let doc = f.contentDocument || f.contentWindow.document;
                        let links = [...doc.querySelectorAll('a')].map(a => ({
                            frame: f.name,
                            text: a.innerText.trim().slice(0,60),
                            href: (a.href||'').slice(0,120),
                            id: a.id,
                        })).filter(a => a.text);
                        out.push(...links);
                    } catch(e) {}
                }
                return JSON.stringify(out);
            })()
        """)
        seen2 = set()
        for a in json.loads(iframe_links or "[]"):
            key = (a['frame'], a['text'])
            if key not in seen2:
                seen2.add(key)
                print(f"  [{a['frame']}] {a['text']!r:40} href={a['href']!r}")

        print("\n=== VISIBLE FORM FIELDS (inputs, selects) ===")
        fields = await eval_js(ws, """
            (function() {
                let out = [];
                let docs = [document];
                for (let f of document.querySelectorAll('iframe')) {
                    try { docs.push(f.contentDocument || f.contentWindow.document); } catch(e) {}
                }
                for (let doc of docs) {
                    let els = doc.querySelectorAll('input:not([type=hidden]), select, textarea');
                    for (let el of els) {
                        out.push({
                            tag: el.tagName,
                            type: el.type || '',
                            name: el.name || '',
                            id: el.id || '',
                            placeholder: el.placeholder || '',
                            value: (el.value||'').slice(0,40),
                        });
                    }
                }
                return JSON.stringify(out);
            })()
        """)
        for f in json.loads(fields or "[]"):
            print(f"  {f['tag']:8} name={f['name']!r:30} id={f['id']!r:20} type={f['type']!r}")


asyncio.run(main())
