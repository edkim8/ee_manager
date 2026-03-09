#!/usr/bin/env python3
"""
inspect_phase_b.py — Run this while the Resident Directory w/Email tab is open.
Scans ALL Chrome targets via CDP and dumps every form field found.
"""
import asyncio, json, urllib.request
import websockets

CDP_PORT = 9222


def get_all_targets():
    with urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json") as r:
        return json.loads(r.read())


async def get_fields(ws_url: str, label: str):
    try:
        async with websockets.connect(ws_url, max_size=10_000_000, open_timeout=5) as ws:
            msg = json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {
                "expression": """
                    (function() {
                        let out = [];
                        let docs = [document];
                        for (let f of document.querySelectorAll('iframe')) {
                            try { docs.push(f.contentDocument || f.contentWindow.document); } catch(e) {}
                        }
                        for (let doc of docs) {
                            for (let el of doc.querySelectorAll('input:not([type=hidden]), select, textarea')) {
                                out.push({
                                    tag:  el.tagName,
                                    id:   el.id   || '',
                                    name: el.name  || '',
                                    type: el.type  || '',
                                    vis:  el.offsetParent !== null,
                                    val:  (el.value || '').slice(0, 30),
                                });
                            }
                        }
                        return JSON.stringify(out);
                    })()
                """,
                "returnByValue": True,
            }})
            await ws.send(msg)
            while True:
                raw = await ws.recv()
                data = json.loads(raw)
                if data.get("id") == 1:
                    val = data.get("result", {}).get("result", {}).get("value", "[]")
                    fields = json.loads(val or "[]")
                    if fields:
                        print(f"\n{'='*60}")
                        print(f"TARGET: {label}")
                        print(f"  {len(fields)} field(s) found:")
                        for f in fields:
                            vis = "VISIBLE" if f["vis"] else "hidden"
                            print(f"  [{vis}] {f['tag']:8} id={f['id']!r:30} name={f['name']!r}")
                    return fields
    except Exception as e:
        print(f"  (could not connect to {label[:50]}: {e})")
        return []


async def main():
    targets = get_all_targets()
    print(f"Found {len(targets)} Chrome targets:\n")

    all_fields = []
    for t in targets:
        url   = t.get("url", "")
        ws    = t.get("webSocketDebuggerUrl", "")
        title = t.get("title", "")
        print(f"  [{t.get('type','?')}] {url[:70]}  title={title[:30]!r}")
        if ws:
            fields = await get_fields(ws, f"{url[:50]} | {title[:30]}")
            all_fields.extend(fields)

    if not any(f["id"] for f in all_fields):
        print("\nNo form fields found in any target.")
    print("\nDone.")


asyncio.run(main())
