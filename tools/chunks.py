"""Parse Docusaurus webpack runtime and list all chunk JS paths."""
import re, sys
s = open(sys.argv[1]).read()
i = s.find('n.u=e=>')
end = s.find('.js"', i)
expr = s[i:end]
maps = re.findall(r'\(\{([^}]*)\}\)\[e\]|\{([^}]*)\}\[e\]', expr)
dicts = []
for a, b in maps:
    body = a or b
    dicts.append(dict(re.findall(r'(\w+):"([^"]+)"', body)))
# typical form: ({id:name}[e]||e)+"."+{id:hash}[e]+".js"
names, hashes = (dicts[0], dicts[1]) if len(dicts) == 2 else ({}, dicts[0])
for cid, h in hashes.items():
    print(f"assets/js/{names.get(cid, cid)}.{h}.js")
