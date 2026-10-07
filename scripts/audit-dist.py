import os, re, json, html
from collections import Counter, defaultdict
D='dist'; pages={}
for root,_,files in os.walk(D):
    for f in files:
        if f.endswith('.html'): pages[os.path.join(root,f)]=open(os.path.join(root,f),errors='ignore').read()
issues=defaultdict(list)
def exists(url):
    u=url.split('#')[0].split('?')[0]
    if not u or u.startswith(('http','mailto:','data:','//')): return True
    p=os.path.join(D,u.lstrip('/'))
    return os.path.exists(p) or os.path.exists(os.path.join(p,'index.html'))
for path,s in pages.items():
    rel=path[len(D):]
    for m in re.findall(r'<a [^>]*href="([^"]+)"',s):
        if not exists(m): issues['broken internal link'].append(f'{rel} -> {m}')
        if m.startswith('https://maxcrime.com/') and 'canonical' not in m: issues['absolute maxcrime.com link (should be relative)'].append(f'{rel} -> {m}')
    for m in re.findall(r'<img [^>]*>',s):
        src=re.search(r'src="([^"]+)"',m); alt=re.search(r'alt="([^"]*)"',m)
        if src and not exists(src.group(1)) and not src.group(1).startswith('http'): issues['missing image file'].append(f'{rel} -> {src.group(1)}')
        if src and src.group(1).startswith('http') and 'ytimg' not in src.group(1): issues['external image'].append(f'{rel} -> {src.group(1)[:90]}')
        if not alt: issues['img without alt attr'].append(f'{rel}: {m[:100]}')
    h1=len(re.findall(r'<h1[\s>]',s))
    if h1!=1: issues[f'h1 count != 1'].append(f'{rel}: {h1}')
    for j in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):
        try: json.loads(html.unescape(j))
        except Exception as e: issues['bad JSON-LD'].append(f'{rel}: {e}')
    ids=Counter(re.findall(r'\sid="([^"]+)"',s))
    for k,v in ids.items():
        if v>1: issues['duplicate id'].append(f'{rel}: {k} x{v}')
    for cls in ['wp-block-embed','wp-embedded-content','is-type-video','wp-block-gallery','wp-block-table','has-text-align','wp-block-quote','wp-block-pullquote','wp-block-buttons','aligncenter','alignleft','alignright','wp-block-separator','iframe','twitter-tweet']:
        if cls in s and rel!='/index.html': issues[f'imported WP markup: {cls}'].append(rel)
    if re.search(r'<p>\s*</p>',s): issues['empty <p>'].append(rel)
    if 'undefined' in re.sub(r'<script.*?</script>','',s,flags=re.S): issues['"undefined" in output'].append(rel)
for k,v in sorted(issues.items()):
    print(f'\n== {k} ({len(v)})'); [print('  ',x) for x in v[:12]]
print('\npages:',len(pages))
